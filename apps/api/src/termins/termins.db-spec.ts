// acme-backend/src/termins/termins.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-17, database test
// `acme_test_wp17` (fase-2-keuangan-operasional.md §2.6). CRUD penuh
// `TerminsService` lewat Prisma + audit nyata. Pola sama
// `src/projects/projects.db-spec.ts`: `auditContextStorage.run()`
// mensimulasikan konteks request TANPA boot HTTP+guard — gerbang
// role/otorisasi sudah diverifikasi terpisah oleh harness matriks (master
// §9.3, test/authz/).
//
// Jalankan (WAJIB prefix DATABASE_URL inline):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp17" \
//     npx jest --config test/jest-db.json --runInBand src/termins/termins.db-spec.ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { auditContextStorage } from '../audit/audit-context';
import { withAuditExtension } from '../audit/audit.extension';
import { PrismaService } from '../prisma/prisma.service';
import { TerminPaymentsService } from './termin-payments.service';
import { TerminsService } from './termins.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);
const service = new TerminsService(prisma as unknown as PrismaService);
const payments = new TerminPaymentsService(
  prisma as unknown as PrismaService,
  service,
);

describe('TerminsService — integrasi Postgres nyata (WP-17)', () => {
  let userId: string;
  const projectIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `wp17-termins-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-17 Termins Test User',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (projectIds.length > 0) {
      // FK termin_payments RESTRICT (R-007): hapus pembayaran dulu; termins lalu ikut CASCADE.
      await raw.terminPayment.deleteMany({
        where: { termin: { projectId: { in: projectIds } } },
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

  async function createProject() {
    const project = await raw.project.create({
      data: {
        name: `WP-17 Termins ${randomUUID()}`,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
      },
    });
    projectIds.push(project.id);
    return project;
  }

  it('CRUD termin lengkap: create → findAll → update → delete', async () => {
    const project = await createProject();

    const created = await withUser(() =>
      service.create(
        project.id,
        {
          name: 'DP 20%',
          type: 'dp',
          amount: 100_000_000,
          dueDate: '2099-08-01',
        },
        userId,
      ),
    );

    expect(created.projectId).toBe(project.id);
    expect(created.amount).toBe(100_000_000);
    expect(created.createdBy).toBe(userId);
    expect(created.status).toBe('BelumBayar');
    expect(created.remaining).toBe(100_000_000);

    const list = await service.findAll(project.id, {});
    expect(list.data.some((t) => t.id === created.id)).toBe(true);
    expect(list.meta.total).toBeGreaterThanOrEqual(1);

    const updated = await withUser(() =>
      service.update(created.id, { notes: 'catatan' }),
    );
    expect(updated.notes).toBe('catatan');
    expect(updated.amount).toBe(100_000_000); // field lain tak berubah

    await withUser(() => service.remove(created.id, userId));
    const listAfterDelete = await service.findAll(project.id, {});
    expect(listAfterDelete.data.some((t) => t.id === created.id)).toBe(false);
  });

  it('update pada termin tak ada → NotFoundException', async () => {
    await expect(
      withUser(() => service.update(randomUUID(), { notes: 'x' })),
    ).rejects.toThrow();
  });

  it('mutasi tercatat di audit_logs dengan user_id yang benar', async () => {
    const project = await createProject();
    const created = await withUser(() =>
      service.create(
        project.id,
        {
          name: 'Termin Audit',
          type: 'termin',
          amount: 50_000_000,
        },
        userId,
      ),
    );

    const insertLog = await raw.auditLog.findFirst({
      where: { tableName: 'termins', recordId: created.id, action: 'INSERT' },
    });
    expect(insertLog?.userId).toBe(userId);
  });

  it('pembayaran: status turunan, kelebihan bayar ditolak 422, terhapus tak dihitung, PPN tampilan', async () => {
    const project = await createProject();
    await raw.project.update({
      where: { id: project.id },
      data: { ppnEnabled: true, ppnRate: 11 },
    });
    const termin = await withUser(() =>
      service.create(
        project.id,
        {
          name: 'T1',
          type: 'termin',
          amount: 1_000_000,
          dueDate: '2099-01-01',
        },
        userId,
      ),
    );
    expect(termin.ppnAmount).toBe(110_000);
    expect(termin.totalWithPpn).toBe(1_110_000);

    const after1 = await withUser(() =>
      payments.create(
        termin.id,
        { paymentDate: '2026-08-01', amount: 400_000 },
        userId,
      ),
    );
    expect(after1.status).toBe('Sebagian');
    expect(after1.totalPaid).toBe(400_000);
    expect(after1.remaining).toBe(600_000);

    await expect(
      withUser(() =>
        payments.create(
          termin.id,
          { paymentDate: '2026-08-02', amount: 600_001 },
          userId,
        ),
      ),
    ).rejects.toMatchObject({ status: 422 });

    const lunas = await withUser(() =>
      payments.create(
        termin.id,
        { paymentDate: '2026-08-03', amount: 600_000 },
        userId,
      ),
    );
    expect(lunas.status).toBe('Lunas');
    expect(lunas.remaining).toBe(0);

    const list = await payments.findAll(termin.id);
    expect(list).toHaveLength(2);
    await withUser(() => payments.remove(list[1].id, userId));
    const after = await service.findOne(termin.id);
    expect(after.status).toBe('Sebagian'); // pembayaran terhapus tak dihitung
    expect(after.totalPaid).toBe(400_000);
    expect(await payments.findAll(termin.id)).toHaveLength(1);

    // ubah jumlah: tidak boleh melampaui sisa
    await expect(
      withUser(() => payments.update(list[0].id, { amount: 1_000_001 })),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('audit pembayaran memuat user pelaku; ubah nominal termin di bawah yang dibayar -> 422; bukti tak dikenal -> 400', async () => {
    const project = await createProject();
    const termin = await withUser(() =>
      service.create(
        project.id,
        { name: 'T2', type: 'termin', amount: 500_000 },
        userId,
      ),
    );
    await withUser(() =>
      payments.create(
        termin.id,
        { paymentDate: '2026-08-01', amount: 300_000 },
        userId,
      ),
    );
    const [p] = await payments.findAll(termin.id);
    await withUser(() => payments.remove(p.id, userId));
    const logs = await raw.auditLog.findMany({
      where: { tableName: 'termin_payments', recordId: p.id },
    });
    expect(logs.map((l) => l.action).sort()).toEqual(['INSERT', 'UPDATE']);
    expect(logs.every((l) => l.userId === userId)).toBe(true);

    await withUser(() =>
      payments.create(
        termin.id,
        { paymentDate: '2026-08-02', amount: 200_000 },
        userId,
      ),
    );
    await expect(
      withUser(() => service.update(termin.id, { amount: 199_999 })),
    ).rejects.toMatchObject({ status: 422 });
    await withUser(() => service.update(termin.id, { amount: 200_000 }));

    await expect(
      withUser(() =>
        payments.create(
          termin.id,
          {
            paymentDate: '2026-08-03',
            amount: 1,
            receiptDocumentId: randomUUID(),
          },
          userId,
        ),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
