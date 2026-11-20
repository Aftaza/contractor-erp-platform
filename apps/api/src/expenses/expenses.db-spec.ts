// acme-backend/src/expenses/expenses.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-17, database test
// `acme_test_wp17` (fase-2-keuangan-operasional.md §2.6). Membuktikan DoD
// paket ini (§4 WP-17):
//   (a) tambah 1 expense senilai X → realisasiBiaya naik TEPAT X
//   (b) amount = 0 ditolak DB (CHECK expenses_amount_positive, P2004) —
//       ditolak DTO diuji terpisah di create-expense.dto.spec.ts (unit,
//       tanpa DB)
//   (c) CRUD expense lengkap
//   (d) contractValue NULL tak membuat endpoint 500
//   (e) master §9.1 titik dobel-hitung: pembelian = Σ baris nota aktif
//       (FR-FIN-3); kolom lama `rab_nodes.purchased_*`, baris/nota terhapus
//       TIDAK ikut terhitung
//
// Node RAB dasar dibuat langsung lewat Prisma mentah (bukan `RabService`).
//
// Jalankan (WAJIB prefix DATABASE_URL inline):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp17" \
//     npx jest --config test/jest-db.json --runInBand src/expenses/expenses.db-spec.ts
import { BadRequestException } from '@nestjs/common';
import { NodeType, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { auditContextStorage } from '../audit/audit-context';
import { withAuditExtension } from '../audit/audit.extension';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);
const service = new ExpensesService(prisma as unknown as PrismaService);

describe('ExpensesService — integrasi Postgres nyata (WP-17)', () => {
  let userId: string;
  const projectIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `wp17-expenses-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-17 Expenses Test User',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (projectIds.length > 0) {
      // purchase_notes RESTRICT → hapus dulu; sisanya ON DELETE CASCADE.
      await raw.purchaseNote.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    }
    await raw.auditLog.deleteMany({ where: { userId } });
    await raw.user.delete({ where: { id: userId } });
    await raw.$disconnect();
  });

  function withUser<T>(fn: () => Promise<T>): Promise<T> {
    return auditContextStorage.run({ userId, clientIp: '127.0.0.1' }, fn);
  }

  async function createProject(contractValue: number | null) {
    const project = await raw.project.create({
      data: {
        name: `WP-17 Expenses ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        contractValue:
          contractValue === null ? undefined : BigInt(contractValue),
      },
    });
    projectIds.push(project.id);
    return project;
  }

  it('CRUD expense lengkap: create → findAll → update → delete (DoD c)', async () => {
    const project = await createProject(1_000_000_000);

    const created = await withUser(() =>
      service.create(
        project.id,
        {
          description: 'Sewa alat berat',
          amount: 15_000_000,
          expenseDate: '2026-08-01',
          category: 'sewa_alat',
        },
        userId,
      ),
    );

    expect(created.projectId).toBe(project.id);
    expect(created.amount).toBe(15_000_000);
    expect(created.recordedBy).toBe(userId);

    const list = await service.findAll(project.id, {});
    expect(list.data.some((e) => e.id === created.id)).toBe(true);

    const updated = await withUser(() =>
      service.update(created.id, { description: 'Sewa alat berat (revisi)' }),
    );
    expect(updated.description).toBe('Sewa alat berat (revisi)');
    expect(updated.amount).toBe(15_000_000);

    await withUser(() => service.remove(created.id, userId));
    const listAfterDelete = await service.findAll(project.id, {});
    expect(listAfterDelete.data.some((e) => e.id === created.id)).toBe(false);
  });

  it('amount = 0 ditolak DB (CHECK expenses_amount_positive, P2004 → 400) (DoD b)', async () => {
    const project = await createProject(0);

    await expect(
      withUser(() =>
        service.create(
          project.id,
          {
            description: 'Amount nol — harus ditolak DB',
            amount: 0,
            expenseDate: '2026-08-01',
            category: 'lain_lain',
          },
          userId,
        ),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('tambah 1 expense senilai X → realisasiBiaya naik TEPAT X (DoD a)', async () => {
    const project = await createProject(500_000_000);

    const before = await service.financeSummary(project.id);
    expect(before.realisasiBiaya).toBe(0);

    const X = 37_500_000;
    await withUser(() =>
      service.create(
        project.id,
        {
          description: 'Expense tunggal',
          amount: X,
          expenseDate: '2026-08-01',
          category: 'material',
        },
        userId,
      ),
    );

    const after = await service.financeSummary(project.id);
    expect(after.realisasiBiaya).toBe(before.realisasiBiaya + X);
    expect(after.expensesAmount).toBe(X);
    expect(after.purchasedAmount).toBe(0);
    expect(after.selisih).toBe(500_000_000 - X);
  });

  it('contractValue NULL tak membuat endpoint 500 — diperlakukan 0 (DoD d)', async () => {
    const project = await createProject(null);

    const summary = await service.financeSummary(project.id);
    expect(summary.contractValue).toBe(0);
    expect(summary.realisasiBiaya).toBe(0);
    expect(summary.selisih).toBe(0);
  });

  it('master §9.1: purchasedAmount = Σ baris nota aktif + expenses, tanpa dobel-hitung kolom lama (FR-FIN-3, DoD e)', async () => {
    const project = await createProject(1_000_000_000);

    const section = await raw.rabNode.create({
      data: { projectId: project.id, nodeType: NodeType.section, name: 'S' },
    });
    // Kolom pembelian lama terisi (sisa data pra-R-001) → TAK boleh ikut terhitung lagi.
    const item = await raw.rabNode.create({
      data: {
        projectId: project.id,
        parentId: section.id,
        nodeType: NodeType.item,
        name: 'Item dibeli',
        volume: 1,
        unit: 'ls',
        materialPrice: 0n,
        isPurchased: true,
        purchasedAmount: 999_999_999n,
      },
    });
    const line = (unitPrice: bigint, deletedAt?: Date) => ({
      rabNodeId: item.id,
      quantity: 1,
      unitPrice,
      deletedAt,
    });
    // Nota aktif: satu baris aktif (200jt) + satu baris terhapus (diabaikan).
    await raw.purchaseNote.create({
      data: {
        projectId: project.id,
        noteDate: new Date('2026-08-01'),
        lines: { create: [line(200_000_000n), line(7n, new Date())] },
      },
    });
    // Nota terhapus → seluruh barisnya diabaikan.
    await raw.purchaseNote.create({
      data: {
        projectId: project.id,
        noteDate: new Date('2026-08-01'),
        deletedAt: new Date(),
        lines: { create: [line(5_000n, new Date())] },
      },
    });

    await withUser(() =>
      service.create(
        project.id,
        {
          description: 'Expense pendamping',
          amount: 10_000_000,
          expenseDate: '2026-08-01',
          category: 'transport',
        },
        userId,
      ),
    );

    const summary = await service.financeSummary(project.id);
    expect(summary.purchasedAmount).toBe(200_000_000); // bukan + kolom lama / baris terhapus
    expect(summary.expensesAmount).toBe(10_000_000);
    expect(summary.realisasiBiaya).toBe(210_000_000); // bukan dobel, bukan salah filter
    expect(summary.selisih).toBe(1_000_000_000 - 210_000_000);
  });
});
