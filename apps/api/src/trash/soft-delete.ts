// Soft delete berkaskade + pulihkan (SRS §3.10 FR-DEL-1..5, R-007).
//
// Satu penanda per aksi hapus: semua baris yang ikut tersembunyi mendapat
// `deleted_at` + `deleted_by` yang SAMA (FR-DEL-3), jadi pemulihan cukup
// mengembalikan baris dengan penanda itu — baris yang sudah terhapus lebih
// dulu (penanda lain) tetap di Tempat Sampah.
//
// Raw SQL dalam satu transaksi interaktif: kaskade menyentuh tabel teraudit
// (projects, rab_nodes, …) yang lewat Prisma akan dibungkus extension audit
// dalam transaksi TERPISAH (audit.extension.ts) — tak atomik. Raw SQL tak
// lewat extension; `setAuditContext` mengisi `app.user_id` agar trigger audit
// tetap mencatat pelaku (FR-DEL-8). Nama tabel/klausa di bawah konstanta,
// nilai selalu parameter `$n` — bukan input pengguna.
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { setAuditContext } from '../audit/audit.extension';
import { PrismaService } from '../prisma/prisma.service';

export const TRASH_TYPES = [
  'project',
  'rab_node',
  'termin',
  'termin_payment',
  'expense',
  'purchase_note',
  'document',
  'client',
  'vendor',
  'tool',
] as const;
export type TrashType = (typeof TRASH_TYPES)[number];

/** Proyek + sub-proyeknya (FR-PRJ-6). UNION (bukan ALL) = pengaman siklus parent_id. $1 = id proyek. */
const PROJECT_TREE = `WITH RECURSIVE t AS (SELECT id FROM projects WHERE id = $1::uuid UNION SELECT p.id FROM projects p JOIN t ON p.parent_id = t.id) SELECT id FROM t`;
/** Node RAB + seluruh turunannya. $1 = id node. */
const NODE_TREE = `WITH RECURSIVE t AS (SELECT id FROM rab_nodes WHERE id = $1::uuid UNION SELECT r.id FROM rab_nodes r JOIN t ON r.parent_id = t.id) SELECT id FROM t`;

/**
 * Baris yang ikut satu aksi hapus, per jenis. Entri pertama = baris utama.
 * Urutan = urutan pulih: `rab_nodes` SEBELUM `purchase_lines` — trigger
 * `purchase_line_validate_set_subtotal` menolak baris aktif pada node
 * terhapus (R-007). Saat hapus urutan bebas.
 */
const SCOPES: Record<TrashType, [table: string, where: string][]> = {
  project: [
    ['projects', `id IN (${PROJECT_TREE})`],
    ['rab_nodes', `project_id IN (${PROJECT_TREE})`],
    ['termins', `project_id IN (${PROJECT_TREE})`],
    [
      'termin_payments',
      `termin_id IN (SELECT id FROM termins WHERE project_id IN (${PROJECT_TREE}))`,
    ],
    ['expenses', `project_id IN (${PROJECT_TREE})`],
    ['purchase_notes', `project_id IN (${PROJECT_TREE})`],
    [
      'purchase_lines',
      `purchase_note_id IN (SELECT id FROM purchase_notes WHERE project_id IN (${PROJECT_TREE}))`,
    ],
    ['project_addenda', `project_id IN (${PROJECT_TREE})`],
    ['documents', `project_id IN (${PROJECT_TREE})`],
  ],
  rab_node: [
    ['rab_nodes', `id IN (${NODE_TREE})`],
    ['purchase_lines', `rab_node_id IN (${NODE_TREE})`],
  ],
  termin: [
    ['termins', 'id = $1::uuid'],
    ['termin_payments', 'termin_id = $1::uuid'],
  ],
  termin_payment: [['termin_payments', 'id = $1::uuid']],
  expense: [['expenses', 'id = $1::uuid']],
  // Nota + barisnya; baris yang dihapus lebih dulu (edit nota) punya penanda lain → tetap terhapus.
  purchase_note: [
    ['purchase_notes', 'id = $1::uuid'],
    ['purchase_lines', 'purchase_note_id = $1::uuid'],
  ],
  // Hapus/pulihkan dokumen tunggal milik modul dokumen (W1-11); di sini untuk kaskade & daftar.
  document: [['documents', 'id = $1::uuid']],
  client: [['clients', 'id = $1::uuid']],
  vendor: [['vendors', 'id = $1::uuid']],
  tool: [['tools', 'id = $1::uuid']],
};

/** Induk yang masih terhapus memblokir pemulihan (baris → 1). $1 = id. */
const DELETED_PARENT: Partial<Record<TrashType, string>> = {
  project: `SELECT 1 FROM projects x JOIN projects p ON p.id = x.parent_id WHERE x.id = $1::uuid AND p.deleted_at IS NOT NULL`,
  rab_node: `SELECT 1 FROM rab_nodes x JOIN projects p ON p.id = x.project_id LEFT JOIN rab_nodes n ON n.id = x.parent_id WHERE x.id = $1::uuid AND (p.deleted_at IS NOT NULL OR n.deleted_at IS NOT NULL)`,
  termin: `SELECT 1 FROM termins x JOIN projects p ON p.id = x.project_id WHERE x.id = $1::uuid AND p.deleted_at IS NOT NULL`,
  termin_payment: `SELECT 1 FROM termin_payments x JOIN termins t ON t.id = x.termin_id WHERE x.id = $1::uuid AND t.deleted_at IS NOT NULL`,
  expense: `SELECT 1 FROM expenses x JOIN projects p ON p.id = x.project_id WHERE x.id = $1::uuid AND p.deleted_at IS NOT NULL`,
  // Proyek terhapus, atau node RAB dari baris yang akan dipulihkan masih terhapus (trigger purchase_lines menolaknya, R-007).
  purchase_note: `SELECT 1 FROM purchase_notes x JOIN projects p ON p.id = x.project_id WHERE x.id = $1::uuid AND (p.deleted_at IS NOT NULL OR EXISTS (SELECT 1 FROM purchase_lines l JOIN rab_nodes n ON n.id = l.rab_node_id WHERE l.purchase_note_id = x.id AND l.deleted_at = x.deleted_at AND l.deleted_by IS NOT DISTINCT FROM x.deleted_by AND n.deleted_at IS NOT NULL))`,
};

// shortcut: trigger rab_node_recompute_progress_trg menghitung ulang progress
// proyek per baris node yang berubah → kaskade proyek/grup besar O(n²); batas
// waktu dinaikkan agar tak gagal. Upgrade bila RAB > ±1000 node: lewati
// recompute per baris (flag sesi) lalu recompute sekali per proyek di akhir.
const TX_OPTIONS = { timeout: 30_000 };

/**
 * Sembunyikan baris `id` beserta kaskadenya. Pemanggil (service modul) sudah
 * memastikan baris ada & aktif dan aturan bisnisnya lolos.
 */
export async function softDelete(
  prisma: PrismaService,
  type: TrashType,
  id: string,
  userId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await setAuditContext(tx);
    for (const [table, where] of SCOPES[type]) {
      await tx.$executeRawUnsafe(
        // now() tetap sama sepanjang transaksi → satu penanda untuk seluruh kaskade.
        `UPDATE ${table} SET deleted_at = now(), deleted_by = $2::uuid WHERE (${where}) AND deleted_at IS NULL`,
        id,
        userId,
      );
    }
  }, TX_OPTIONS);
}

/** Pulihkan baris `id` + semua yang terhapus bersamanya (penanda sama). */
export async function restoreDeleted(
  prisma: PrismaService,
  type: TrashType,
  id: string,
): Promise<void> {
  const scopes = SCOPES[type];
  await prisma
    .$transaction(async (tx) => {
      await setAuditContext(tx);
      // Penanda & cek induk dibaca di transaksi yang sama (FOR UPDATE mengunci baris utama).
      const [stamp] = await tx.$queryRawUnsafe<
        { deleted_at: string | null; deleted_by: string | null }[]
      >(
        // ::text menjaga presisi mikrodetik penanda (Date JS hanya milidetik).
        `SELECT deleted_at::text AS deleted_at, deleted_by::text AS deleted_by FROM ${scopes[0][0]} WHERE id = $1::uuid FOR UPDATE`,
        id,
      );
      if (!stamp?.deleted_at) {
        throw new NotFoundException('Data tidak ada di Tempat Sampah');
      }
      const parentCheck = DELETED_PARENT[type];
      if (
        parentCheck &&
        (await tx.$queryRawUnsafe<unknown[]>(parentCheck, id)).length > 0
      ) {
        throw new ConflictException(
          'Induk data ini masih terhapus — pulihkan induknya lebih dulu',
        );
      }
      for (const [table, where] of scopes) {
        await tx.$executeRawUnsafe(
          `UPDATE ${table} SET deleted_at = NULL, deleted_by = NULL WHERE (${where}) AND deleted_at = $2::timestamptz AND deleted_by IS NOT DISTINCT FROM $3::uuid`,
          id,
          stamp.deleted_at,
          stamp.deleted_by,
        );
      }
    }, TX_OPTIONS)
    .catch((err: unknown) => {
      // 23505 = indeks unik parsial (mis. `tools.code` aktif) dipakai baris lain (FR-DEL-5).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2010' &&
        err.meta?.code === '23505'
      ) {
        throw new ConflictException(
          'Tidak bisa dipulihkan — kodenya sudah dipakai data aktif lain',
        );
      }
      throw err;
    });
}

/** 404 bila proyek tak ada atau terhapus — data baru tak boleh menempel ke proyek terhapus. */
export async function assertActiveProject(
  prisma: PrismaService,
  projectId: string,
): Promise<void> {
  const found = await prisma.project.count({
    where: { id: projectId, deletedAt: null },
  });
  if (!found) throw new NotFoundException('Proyek tidak ditemukan');
}
