// acme-backend/src/rab/rab.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-14, database test
// `acme_test_wp14` (fase-1-vertikal-rab.md §2.1). Membuktikan lapisan
// service+trigger DB nyata (bukan mengulang cakupan unit test
// `rab.service.spec.ts`, yang memakai Prisma mock):
//
//   (a) admin ditolak 403 saat rab_status='approved', pimpinan tetap lolos
//   (b) approve → projects.progress terisi ≠ 0
//   (c) ubah progress satu leaf → projects.progress ikut berubah (lewat
//       agregasi bottom-up multi-level: leaf → subgroup → section/root)
//   (d) trigger DB mengisi `total` = (material+upah)×volume
//   (e) set progress pada node yang punya anak → ditolak
//
// Pola sama seperti src/projects/projects.db-spec.ts: `auditContextStorage`
// mensimulasikan konteks request TANPA boot HTTP+guard — gerbang
// role/RolesGuard sudah diverifikasi terpisah oleh harness matriks (master
// §9.3, test/authz/). Suite ini membuktikan `RabService` + trigger, bukan
// mengulang cakupan itu.
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-1 §2.1):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp14" \
//     npx jest --config test/jest-db.json --runInBand src/rab/rab.db-spec.ts
import { ForbiddenException } from '@nestjs/common';
import { NodeType, PrismaClient, RabStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { auditContextStorage } from '../audit/audit-context';
import { withAuditExtension } from '../audit/audit.extension';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabService } from './rab.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);
const service = new RabService(
  prisma as unknown as PrismaService,
  new PolicyService(),
);

describe('RabService — integrasi Postgres nyata (WP-14)', () => {
  let userId: string;
  const projectIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `wp14-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-14 Test User',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (projectIds.length > 0) {
      // ON DELETE CASCADE (migration.sql) membersihkan rab_nodes otomatis.
      await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    }
    await raw.auditLog.deleteMany({ where: { userId } });
    await raw.user.delete({ where: { id: userId } });
    await raw.$disconnect();
  });

  function withUser<T>(fn: () => Promise<T>): Promise<T> {
    return auditContextStorage.run({ userId, clientIp: '127.0.0.1' }, fn);
  }

  async function createDraftProject(
    overrides: Partial<{ ppnEnabled: boolean; ppnRate: number }> = {},
  ) {
    const project = await raw.project.create({
      data: {
        name: `WP-14 ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        ppnEnabled: overrides.ppnEnabled ?? false,
        ppnRate: overrides.ppnRate ?? 11,
      },
    });
    projectIds.push(project.id);
    return project;
  }

  it('pohon bervariasi kedalaman: section→item (L1) dan section→subgroup→item (L2) hidup bersisian; GET nodes menyusunnya bersarang', async () => {
    const project = await createDraftProject();

    const section = await withUser(() =>
      service.create(
        project.id,
        { nodeType: NodeType.section, name: 'Pekerjaan Persiapan' },
        'pimpinan',
      ),
    );
    const itemL1 = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: section.id,
          nodeType: NodeType.item,
          name: 'Papan Nama Proyek',
          volume: 1,
          unit: 'ls',
          materialPrice: 500_000,
        },
        'pimpinan',
      ),
    );
    const subgroup = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: section.id,
          nodeType: NodeType.subgroup,
          name: 'Mobilisasi',
        },
        'pimpinan',
      ),
    );
    const itemL2 = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: subgroup.id,
          nodeType: NodeType.item,
          name: 'Sewa Alat Berat',
          volume: 2,
          unit: 'unit',
          laborPrice: 1_000_000,
        },
        'pimpinan',
      ),
    );

    const tree = await service.getTree(project.id);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(section.id);
    expect(tree[0].children.map((c) => c.id).sort()).toEqual(
      [itemL1.id, subgroup.id].sort(),
    );
    const subgroupNode = tree[0].children.find((c) => c.id === subgroup.id)!;
    expect(subgroupNode.children).toHaveLength(1);
    expect(subgroupNode.children[0].id).toBe(itemL2.id);
  });

  it('trigger DB mengisi total = (material+upah)×volume — tak dihitung aplikasi (DoD d)', async () => {
    const project = await createDraftProject();
    const section = await withUser(() =>
      service.create(
        project.id,
        { nodeType: NodeType.section, name: 'S' },
        'pimpinan',
      ),
    );

    const item = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: section.id,
          nodeType: NodeType.item,
          name: 'Pasir Urug',
          volume: 10,
          unit: 'm3',
          materialPrice: 100_000,
          laborPrice: 50_000,
        },
        'pimpinan',
      ),
    );

    expect(item.total).toBe(1_500_000n);
  });

  it('set progress pada node yang punya anak → ditolak (DoD e)', async () => {
    const project = await createDraftProject();
    const section = await withUser(() =>
      service.create(
        project.id,
        { nodeType: NodeType.section, name: 'S' },
        'pimpinan',
      ),
    );
    const subgroup = await withUser(() =>
      service.create(
        project.id,
        { parentId: section.id, nodeType: NodeType.subgroup, name: 'G' },
        'pimpinan',
      ),
    );

    // Cabang 1: node bukan item (subgroup) — selalu punya progress_percent
    // terkunci ke 0 oleh CHECK DB, ditolak di layer service dulu.
    await expect(
      service.updateProgress(subgroup.id, { progressPercent: 50 }),
    ).rejects.toThrow('progress_percent hanya berlaku untuk node item');

    // Cabang 2: node item yang (secara data, di luar jalur normal
    // RabService.create — parentId item diblokir di sana) punya anak —
    // membuktikan childCount>0 benar-benar diperiksa, bukan cabang mati.
    const itemWithChild = await raw.rabNode.create({
      data: {
        projectId: project.id,
        parentId: section.id,
        nodeType: NodeType.item,
        name: 'Item ganjil (test only)',
        volume: 1,
        unit: 'ls',
        materialPrice: 1,
      },
    });
    await raw.rabNode.create({
      data: {
        projectId: project.id,
        parentId: itemWithChild.id,
        nodeType: NodeType.section,
        name: 'Anak ganjil (test only)',
      },
    });
    await expect(
      service.updateProgress(itemWithChild.id, { progressPercent: 50 }),
    ).rejects.toThrow('leaf');
  });

  it('admin ditolak 403 saat rab_status approved; pimpinan tetap lolos (DoD a)', async () => {
    const project = await createDraftProject();
    const section = await withUser(() =>
      service.create(
        project.id,
        { nodeType: NodeType.section, name: 'S' },
        'pimpinan',
      ),
    );
    await withUser(() => service.approve(project.id, userId));

    await expect(
      withUser(() =>
        service.update(section.id, { name: 'Diubah admin' }, 'admin'),
      ),
    ).rejects.toThrow(ForbiddenException);

    const updated = await withUser(() =>
      service.update(section.id, { name: 'Diubah pimpinan' }, 'pimpinan'),
    );
    expect(updated.name).toBe('Diubah pimpinan');
  });

  it('approve → projects.progress terisi ≠ 0; ubah progress leaf lewat 2 level → projects.progress ikut berubah (DoD b, c)', async () => {
    const project = await createDraftProject();
    const section = await withUser(() =>
      service.create(
        project.id,
        { nodeType: NodeType.section, name: 'S' },
        'pimpinan',
      ),
    );
    const itemDirect = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: section.id,
          nodeType: NodeType.item,
          name: 'Item L1',
          volume: 1,
          unit: 'ls',
          materialPrice: 1_000_000,
        },
        'pimpinan',
      ),
    );
    const subgroup = await withUser(() =>
      service.create(
        project.id,
        { parentId: section.id, nodeType: NodeType.subgroup, name: 'G' },
        'pimpinan',
      ),
    );
    const itemNested = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: subgroup.id,
          nodeType: NodeType.item,
          name: 'Item L2',
          volume: 1,
          unit: 'ls',
          materialPrice: 1_000_000,
        },
        'pimpinan',
      ),
    );

    // Progress leaf boleh diset SEBELUM approve (matriks §4.8: tak
    // bergantung rab_status) — nilainya baru berefek ke projects.progress
    // setelah approve (recompute_project_progress hanya aktif saat
    // rab_status='approved', migration.sql).
    await withUser(() =>
      service.updateProgress(itemDirect.id, { progressPercent: 100 }),
    );
    await withUser(() =>
      service.updateProgress(itemNested.id, { progressPercent: 0 }),
    );

    const beforeApprove = await raw.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(beforeApprove.progress)).toBe(0); // masih draft, trigger belum aktif

    await withUser(() => service.approve(project.id, userId));
    const afterApprove = await raw.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    // Value-weighted: (1jt×100 + 1jt×0) / 2jt = 50 — dua item bobot sama.
    expect(Number(afterApprove.progress)).toBe(50);
    expect(Number(afterApprove.progress)).not.toBe(0);
    expect(afterApprove.rabStatus).toBe(RabStatus.approved);

    // (c) ubah progress SATU leaf nested (L2, lewat subgroup) setelah
    // approve → projects.progress (satu-satunya cache tersimpan — rab_nodes
    // TAK menyimpan progress induk, lihat catatan rab.service.ts) ikut
    // berubah, membuktikan agregasi bottom-up berjalan lintas level.
    await withUser(() =>
      service.updateProgress(itemNested.id, { progressPercent: 100 }),
    );
    const afterLeafChange = await raw.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(Number(afterLeafChange.progress)).toBe(100);
  });

  it('summary: subtotal dari Σ total item sungguhan, PPN, roundup 100.000 (master §5.6)', async () => {
    const project = await createDraftProject({ ppnEnabled: true, ppnRate: 11 });
    const section = await withUser(() =>
      service.create(
        project.id,
        { nodeType: NodeType.section, name: 'S' },
        'pimpinan',
      ),
    );
    // total = (1_000_000 + 0) * 1 = 1_000_000
    await withUser(() =>
      service.create(
        project.id,
        {
          parentId: section.id,
          nodeType: NodeType.item,
          name: 'Item A',
          volume: 1,
          unit: 'ls',
          materialPrice: 1_000_000,
        },
        'pimpinan',
      ),
    );

    const summary = await service.summary(project.id);
    expect(summary.subtotal).toBe(1_000_000);
    expect(summary.ppnAmount).toBe(110_000); // 11% dari 1.000.000
    expect(summary.grandTotal).toBe(1_200_000); // roundup(1.110.000, 100.000)
  });

  // ---------------------------------------------------------------------
  // WP-14b (fase-1 §5b U4) — rollup progress node induk, dihitung SAAT
  // DIBACA lewat recursive CTE (`RabService.rollupByNode`), bukan trigger.
  // Mitigasi WAJIB: rumus agregasi kini tertulis di DUA tempat (PL/pgSQL
  // `recompute_project_progress` & query baca) — test ini yang gagal lebih
  // dulu kalau keduanya drift.
  // ---------------------------------------------------------------------

  it('rollup(node akar) dari GET nodes == projects.progress hasil hitungan DB (mitigasi wajib §5b U4)', async () => {
    const project = await createDraftProject();
    const section = await withUser(() =>
      service.create(
        project.id,
        { nodeType: NodeType.section, name: 'S' },
        'pimpinan',
      ),
    );
    const itemDirect = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: section.id,
          nodeType: NodeType.item,
          name: 'Item L1',
          volume: 1,
          unit: 'ls',
          materialPrice: 1_000_000,
        },
        'pimpinan',
      ),
    );
    const subgroup = await withUser(() =>
      service.create(
        project.id,
        { parentId: section.id, nodeType: NodeType.subgroup, name: 'G' },
        'pimpinan',
      ),
    );
    const itemNested = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: subgroup.id,
          nodeType: NodeType.item,
          name: 'Item L2',
          volume: 3,
          unit: 'ls',
          materialPrice: 2_000_000,
        },
        'pimpinan',
      ),
    );
    await withUser(() =>
      service.updateProgress(itemDirect.id, { progressPercent: 40 }),
    );
    await withUser(() =>
      service.updateProgress(itemNested.id, { progressPercent: 70 }),
    );
    await withUser(() => service.approve(project.id, userId));

    // Ubah satu leaf lagi SETELAH approve supaya progress akar bukan angka
    // "kebetulan bulat" (mis. 50/100) — menutup celah test yang lolos
    // walau rumusnya salah tapi angkanya kebetulan cocok.
    await withUser(() =>
      service.updateProgress(itemNested.id, { progressPercent: 55 }),
    );

    const afterProject = await raw.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    const tree = await service.getTree(project.id);
    const root = tree.find((n) => n.id === section.id)!;

    expect(root.rollup).toBe(Number(afterProject.progress));
    expect(root.rollup).not.toBe(0);
  });

  it('rollup benar di tiap tingkat pohon berkedalaman variasi: section→subgroup→phase→item (DoD tambahan §5b U4)', async () => {
    const project = await createDraftProject();
    const section = await withUser(() =>
      service.create(
        project.id,
        { nodeType: NodeType.section, name: 'Section' },
        'pimpinan',
      ),
    );
    // Item langsung di bawah section.
    const itemL1 = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: section.id,
          nodeType: NodeType.item,
          name: 'Item L1',
          volume: 1,
          unit: 'ls',
          materialPrice: 1_000_000, // total 1jt
        },
        'pimpinan',
      ),
    );
    const subgroup = await withUser(() =>
      service.create(
        project.id,
        { parentId: section.id, nodeType: NodeType.subgroup, name: 'Subgroup' },
        'pimpinan',
      ),
    );
    const phase = await withUser(() =>
      service.create(
        project.id,
        { parentId: subgroup.id, nodeType: NodeType.phase, name: 'Phase' },
        'pimpinan',
      ),
    );
    // Dua item di bawah phase, bobot beda (1jt vs 3jt).
    const itemPhaseA = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: phase.id,
          nodeType: NodeType.item,
          name: 'Item Phase A',
          volume: 1,
          unit: 'ls',
          materialPrice: 1_000_000, // total 1jt
        },
        'pimpinan',
      ),
    );
    const itemPhaseB = await withUser(() =>
      service.create(
        project.id,
        {
          parentId: phase.id,
          nodeType: NodeType.item,
          name: 'Item Phase B',
          volume: 3,
          unit: 'ls',
          materialPrice: 1_000_000, // total 3jt
        },
        'pimpinan',
      ),
    );

    await withUser(() =>
      service.updateProgress(itemL1.id, { progressPercent: 20 }),
    );
    await withUser(() =>
      service.updateProgress(itemPhaseA.id, { progressPercent: 100 }),
    );
    await withUser(() =>
      service.updateProgress(itemPhaseB.id, { progressPercent: 0 }),
    );

    const tree = await service.getTree(project.id);
    const sectionNode = tree.find((n) => n.id === section.id)!;
    const itemL1Node = sectionNode.children.find((n) => n.id === itemL1.id)!;
    const subgroupNode = sectionNode.children.find(
      (n) => n.id === subgroup.id,
    )!;
    const phaseNode = subgroupNode.children.find((n) => n.id === phase.id)!;
    const itemPhaseANode = phaseNode.children.find(
      (n) => n.id === itemPhaseA.id,
    )!;
    const itemPhaseBNode = phaseNode.children.find(
      (n) => n.id === itemPhaseB.id,
    )!;

    // item: rollup == progress_percent sendiri.
    expect(itemL1Node.rollup).toBe(20);
    expect(itemPhaseANode.rollup).toBe(100);
    expect(itemPhaseBNode.rollup).toBe(0);

    // phase: value-weighted (1jt×100 + 3jt×0) / 4jt = 25.
    expect(phaseNode.rollup).toBe(25);

    // subgroup: cuma satu keturunan item (lewat phase) — sama dengan phase.
    expect(subgroupNode.rollup).toBe(25);

    // section (akar): value-weighted seluruh item keturunan —
    // (1jt×20 + 1jt×100 + 3jt×0) / 5jt = 24.
    expect(sectionNode.rollup).toBe(24);
  });
});
