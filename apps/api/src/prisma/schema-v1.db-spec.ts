// Integrasi Postgres nyata untuk migration W0-05 (20261111120000_schema_v1_wave1):
// progress mengabaikan node terhapus (FR-DEL-2), soft delete + indeks unik
// parsial tools.code (FR-DEL-5), trigger purchase_lines (FR-FIN-3), dan audit
// tabel baru (SRS §6).
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_AUDITED_TABLES = [
  'termin_payments',
  'purchase_notes',
  'purchase_lines',
  'rab_progress_logs',
  'project_progress_snapshots',
  'rab_versions',
  'project_addenda',
  'documents',
  'document_files',
  'settings',
];

async function createProject(rabStatus: 'draft' | 'approved' = 'draft') {
  return prisma.project.create({
    data: {
      name: `W0-05 test ${randomUUID().slice(0, 8)}`,
      location: 'Surabaya',
      contractType: 'one_time',
      status: 'Aktif',
      startDate: new Date('2026-01-01'),
      rabStatus,
    },
  });
}

async function progressOf(projectId: string): Promise<number> {
  const p = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });
  return Number(p.progress);
}

describe('skema gelombang 1 (W0-05)', () => {
  const projectIds: string[] = [];

  afterAll(async () => {
    // FK RESTRICT: anak uang dihapus dulu sebelum proyek
    await prisma.purchaseNote.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.terminPayment.deleteMany({
      where: { termin: { projectId: { in: projectIds } } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.$disconnect();
  });

  describe('progress mengabaikan node terhapus (FR-DEL-2)', () => {
    it('soft delete item → keluar dari agregasi; pulihkan → kembali', async () => {
      const project = await createProject('approved');
      projectIds.push(project.id);
      // A: 1.000.000 @100%, B: 1.000.000 @0% → 50%
      const a = await prisma.rabNode.create({
        data: {
          projectId: project.id,
          nodeType: 'item',
          name: 'A',
          volume: 10,
          unit: 'M3',
          materialPrice: 100000n,
          progressPercent: 100,
        },
      });
      const b = await prisma.rabNode.create({
        data: {
          projectId: project.id,
          nodeType: 'item',
          name: 'B',
          volume: 10,
          unit: 'M3',
          materialPrice: 100000n,
        },
      });
      expect(await progressOf(project.id)).toBe(50);

      await prisma.rabNode.update({
        where: { id: b.id },
        data: { deletedAt: new Date() },
      });
      expect(await progressOf(project.id)).toBe(100);

      await prisma.rabNode.update({
        where: { id: b.id },
        data: { deletedAt: null },
      });
      expect(await progressOf(project.id)).toBe(50);

      // semua item terhapus → 0, bukan sisa nilai lama
      await prisma.rabNode.updateMany({
        where: { id: { in: [a.id, b.id] } },
        data: { deletedAt: new Date() },
      });
      expect(await progressOf(project.id)).toBe(0);
    });

    it('soft delete node grup → seluruh turunannya ikut keluar walau turunannya tak ditandai', async () => {
      const project = await createProject('approved');
      projectIds.push(project.id);
      const section = await prisma.rabNode.create({
        data: { projectId: project.id, nodeType: 'section', name: 'S' },
      });
      await prisma.rabNode.create({
        data: {
          projectId: project.id,
          parentId: section.id,
          nodeType: 'item',
          name: 'Di dalam S',
          volume: 1,
          unit: 'LS',
          materialPrice: 3000000n,
          progressPercent: 0,
        },
      });
      await prisma.rabNode.create({
        data: {
          projectId: project.id,
          nodeType: 'item',
          name: 'Di luar S',
          volume: 1,
          unit: 'LS',
          materialPrice: 1000000n,
          progressPercent: 100,
        },
      });
      expect(await progressOf(project.id)).toBe(25);

      await prisma.rabNode.update({
        where: { id: section.id },
        data: { deletedAt: new Date() },
      });
      expect(await progressOf(project.id)).toBe(100);
    });
  });

  describe('tools.code unik hanya di baris aktif (FR-DEL-5)', () => {
    it('kode bentrok dengan alat aktif → P2002; setelah alat lama dihapus lunak → boleh dipakai ulang', async () => {
      const code = `W005-${randomUUID().slice(0, 8)}`;
      const first = await prisma.tool.create({ data: { code, name: 'Lama' } });

      await expect(
        prisma.tool.create({ data: { code, name: 'Bentrok' } }),
      ).rejects.toMatchObject({ code: 'P2002' });

      await prisma.tool.update({
        where: { id: first.id },
        data: { deletedAt: new Date() },
      });
      const second = await prisma.tool.create({
        data: { code, name: 'Baru' },
      });

      // pulihkan alat lama → bentrok dengan yang aktif (dasar 409 di W1-01)
      await expect(
        prisma.tool.update({
          where: { id: first.id },
          data: { deletedAt: null },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });

      await prisma.tool.deleteMany({
        where: { id: { in: [first.id, second.id] } },
      });
    });
  });

  describe('purchase_lines (FR-FIN-3)', () => {
    it('subtotal di-set DB = ROUND(quantity × unit_price), tak bisa ditimpa', async () => {
      const project = await createProject();
      projectIds.push(project.id);
      const item = await prisma.rabNode.create({
        data: {
          projectId: project.id,
          nodeType: 'item',
          name: 'Besi',
          volume: 100,
          unit: 'KG',
          materialPrice: 15000n,
        },
      });
      const note = await prisma.purchaseNote.create({
        data: { projectId: project.id, noteDate: new Date('2026-02-01') },
      });
      const line = await prisma.purchaseLine.create({
        data: {
          purchaseNoteId: note.id,
          rabNodeId: item.id,
          quantity: new Prisma.Decimal('2.5'),
          unitPrice: 14999n,
          subtotal: 1n,
        },
      });
      expect(line.subtotal).toBe(37498n); // 37497.5 → 37498
    });

    it('menolak node grup, item proyek lain, dan item terhapus', async () => {
      const project = await createProject();
      const other = await createProject();
      projectIds.push(project.id, other.id);
      const section = await prisma.rabNode.create({
        data: { projectId: project.id, nodeType: 'section', name: 'S' },
      });
      const foreignItem = await prisma.rabNode.create({
        data: {
          projectId: other.id,
          nodeType: 'item',
          name: 'Item proyek lain',
          volume: 1,
          unit: 'LS',
          materialPrice: 1000n,
        },
      });
      const deletedItem = await prisma.rabNode.create({
        data: {
          projectId: project.id,
          nodeType: 'item',
          name: 'Item terhapus',
          volume: 1,
          unit: 'LS',
          materialPrice: 1000n,
          deletedAt: new Date(),
        },
      });
      const note = await prisma.purchaseNote.create({
        data: { projectId: project.id, noteDate: new Date('2026-02-01') },
      });

      for (const rabNodeId of [section.id, foreignItem.id, deletedItem.id]) {
        await expect(
          prisma.purchaseLine.create({
            data: {
              purchaseNoteId: note.id,
              rabNodeId,
              quantity: 1,
              unitPrice: 1000n,
            },
          }),
        ).rejects.toThrow(/bukan item RAB aktif dari proyek nota yang sama/);
      }
    });

    it('kaskade: item dihapus lunak lalu barisnya ikut dihapus → sukses; pulihkan baris selagi item terhapus → ditolak', async () => {
      const project = await createProject();
      projectIds.push(project.id);
      const item = await prisma.rabNode.create({
        data: {
          projectId: project.id,
          nodeType: 'item',
          name: 'Pasir',
          volume: 5,
          unit: 'M3',
          materialPrice: 250000n,
        },
      });
      const note = await prisma.purchaseNote.create({
        data: { projectId: project.id, noteDate: new Date('2026-02-01') },
      });
      const line = await prisma.purchaseLine.create({
        data: {
          purchaseNoteId: note.id,
          rabNodeId: item.id,
          quantity: 5,
          unitPrice: 250000n,
        },
      });
      const deletedAt = new Date();

      await prisma.rabNode.update({
        where: { id: item.id },
        data: { deletedAt },
      });
      await expect(
        prisma.purchaseLine.update({
          where: { id: line.id },
          data: { deletedAt },
        }),
      ).resolves.toMatchObject({ id: line.id });

      await expect(
        prisma.purchaseLine.update({
          where: { id: line.id },
          data: { deletedAt: null },
        }),
      ).rejects.toThrow(/bukan item RAB aktif dari proyek nota yang sama/);
    });

    it('proyek nota yang sudah berbaris tak bisa dipindah', async () => {
      const project = await createProject();
      const other = await createProject();
      projectIds.push(project.id, other.id);
      const item = await prisma.rabNode.create({
        data: {
          projectId: project.id,
          nodeType: 'item',
          name: 'Semen',
          volume: 10,
          unit: 'SAK',
          materialPrice: 60000n,
        },
      });
      const note = await prisma.purchaseNote.create({
        data: { projectId: project.id, noteDate: new Date('2026-02-01') },
      });
      await prisma.purchaseLine.create({
        data: {
          purchaseNoteId: note.id,
          rabNodeId: item.id,
          quantity: 1,
          unitPrice: 60000n,
        },
      });

      await expect(
        prisma.purchaseNote.update({
          where: { id: note.id },
          data: { projectId: other.id },
        }),
      ).rejects.toThrow(/tak bisa diubah karena sudah punya baris/);
    });
  });

  describe('FK RESTRICT — hard delete kode lama tak menghapus data uang', () => {
    it('hard delete termin yang punya pembayaran → 23503, pembayaran utuh', async () => {
      const project = await createProject();
      projectIds.push(project.id);
      const termin = await prisma.termin.create({
        data: {
          projectId: project.id,
          name: 'Termin dibayar',
          type: 'termin',
          amount: 1000000n,
          status: 'Sebagian',
        },
      });
      const payment = await prisma.terminPayment.create({
        data: {
          terminId: termin.id,
          paymentDate: new Date('2026-03-01'),
          amount: 500000n,
        },
      });

      await expect(
        prisma.$executeRaw`DELETE FROM "termins" WHERE "id" = ${termin.id}::uuid`,
      ).rejects.toThrow(/23503/);
      await expect(
        prisma.terminPayment.findUnique({ where: { id: payment.id } }),
      ).resolves.not.toBeNull();
    });
  });

  describe('audit tabel baru (SRS §6)', () => {
    it('setiap tabel baru punya trigger audit', async () => {
      const rows = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT c.relname AS table_name
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE p.proname = 'audit_trigger_fn' AND NOT t.tgisinternal`;
      const audited = rows.map((r) => r.table_name);
      expect(audited).toEqual(expect.arrayContaining(NEW_AUDITED_TABLES));
    });

    it('insert + soft delete termin_payments tercatat dengan user dari app.user_id', async () => {
      const project = await createProject();
      projectIds.push(project.id);
      const user = await prisma.user.create({
        data: {
          email: `w005-${randomUUID()}@test.local`,
          passwordHash: 'x',
          fullName: 'Audit W0-05',
          role: 'pimpinan',
        },
      });
      const termin = await prisma.termin.create({
        data: {
          projectId: project.id,
          name: 'Termin 1',
          type: 'termin',
          amount: 1000000n,
          status: 'BelumBayar',
        },
      });

      const payment = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.user_id', ${user.id}, true)`;
        const p = await tx.terminPayment.create({
          data: {
            terminId: termin.id,
            paymentDate: new Date('2026-03-01'),
            amount: 400000n,
          },
        });
        await tx.terminPayment.update({
          where: { id: p.id },
          data: { deletedAt: new Date(), deletedBy: user.id },
        });
        return p;
      });

      const logs = await prisma.auditLog.findMany({
        where: { tableName: 'termin_payments', recordId: payment.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(logs.map((l) => l.action)).toEqual(['INSERT', 'UPDATE']);
      expect(logs.every((l) => l.userId === user.id)).toBe(true);
      expect((logs[1].newData as Record<string, unknown>).deleted_by).toBe(
        user.id,
      );

      await prisma.auditLog.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('termin_payments.amount harus > 0', async () => {
      const project = await createProject();
      projectIds.push(project.id);
      const termin = await prisma.termin.create({
        data: {
          projectId: project.id,
          name: 'Termin 0',
          type: 'dp',
          amount: 1000n,
          status: 'BelumBayar',
        },
      });
      await expect(
        prisma.terminPayment.create({
          data: { terminId: termin.id, paymentDate: new Date(), amount: 0n },
        }),
      ).rejects.toThrow(/termin_payments_amount_positive/);
    });
  });
});
