// acme-backend/src/projects/projects.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-13, database test
// `acme_test_wp13` (fase-1-vertikal-rab.md §2.1). Menguji CRUD ProjectsService
// lewat Prisma + trigger DB nyata, `PATCH /:id/publication` hanya menyentuh
// kolom publik, dan mutasi tercatat di `audit_logs` dengan `user_id` benar.
//
// Pola sama seperti src/audit/audit-extension.db-spec.ts:
// `auditContextStorage.run()` mensimulasikan konteks request (user id + ip)
// TANPA boot HTTP+guard — gerbang role/otorisasi rute sudah diverifikasi
// terpisah oleh harness matriks (master §9.3, test/authz/). Suite ini
// membuktikan lapisan service+DB, bukan mengulang cakupan itu.
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-1 §2.1):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp13" \
//     npx jest --config test/jest-db.json --runInBand src/projects/projects.db-spec.ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { auditContextStorage } from '../audit/audit-context';
import { withAuditExtension } from '../audit/audit.extension';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);
const service = new ProjectsService(prisma as unknown as PrismaService);

describe('ProjectsService — integrasi Postgres nyata (WP-13)', () => {
  let userId: string;
  const projectIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `wp13-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-13 Test User',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (projectIds.length > 0) {
      await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    }
    await raw.auditLog.deleteMany({ where: { userId } });
    await raw.user.delete({ where: { id: userId } });
    await raw.$disconnect();
  });

  function withUser<T>(fn: () => Promise<T>): Promise<T> {
    return auditContextStorage.run({ userId, clientIp: '127.0.0.1' }, fn);
  }

  it('create → findOne → update → remove: CRUD penuh terhadap Postgres nyata', async () => {
    const created = await withUser(() =>
      service.create(
        {
          name: `WP-13 CRUD ${randomUUID()}`,
          location: 'Surabaya',
          contractType: 'one_time',
          status: 'Aktif',
          startDate: '2026-01-01',
          contractValue: 750_000_000,
        },
        userId,
      ),
    );
    projectIds.push(created.id);

    expect(created.contractValue).toBe(750_000_000);
    expect(created.rabStatus).toBe('draft'); // default DB, bukan diset app
    expect(created.createdBy).toBe(userId);

    const found = await service.findOne(created.id);
    expect(found.name).toBe(created.name);

    const updated = await withUser(() =>
      service.update(created.id, { location: 'Surabaya' }),
    );
    expect(updated.location).toBe('Surabaya');
    expect(updated.name).toBe(created.name); // field lain tak ikut berubah

    await withUser(() => service.remove(created.id, userId));
    await expect(service.findOne(created.id)).rejects.toThrow();
  });

  it('list (GET /projects) mengembalikan bentuk {data, meta} master §3.2 dan menghormati paginasi', async () => {
    for (let i = 0; i < 3; i += 1) {
      const p = await withUser(() =>
        service.create(
          {
            name: `WP-13 List ${randomUUID()}`,
            location: 'Surabaya',
            contractType: 'one_time',
            status: 'Aktif',
            startDate: '2026-01-01',
          },
          userId,
        ),
      );
      projectIds.push(p.id);
    }

    const page1 = await service.findAll({ page: 1, perPage: 2 });
    expect(page1.data.length).toBeLessThanOrEqual(2);
    expect(page1.meta).toEqual(
      expect.objectContaining({ page: 1, perPage: 2 }),
    );
    expect(page1.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('PATCH /:id/publication HANYA mengubah is_published + public_* — kolom internal tak tersentuh', async () => {
    const created = await withUser(() =>
      service.create(
        {
          name: `WP-13 Publikasi ${randomUUID()}`,
          location: 'Surabaya',
          contractType: 'kontrak_payung',
          status: 'Aktif',
          startDate: '2026-01-01',
          contractValue: 1_000_000_000,
        },
        userId,
      ),
    );
    projectIds.push(created.id);

    const published = await withUser(() =>
      service.updatePublication(created.id, {
        isPublished: true,
        publicTitle: 'Judul Publik',
        publicSummary: 'Ringkasan publik',
        publicCategory: 'Industri',
        publicImages: ['https://example.com/a.jpg'],
      }),
    );

    expect(published.isPublished).toBe(true);
    expect(published.publicTitle).toBe('Judul Publik');
    expect(published.publicCategory).toBe('Industri');
    // Kolom internal SAMA SEKALI tak berubah — bukti pemisahan kolom (master §4.2).
    expect(published.contractValue).toBe(1_000_000_000);
    expect(published.location).toBe('Surabaya');
    expect(published.rabStatus).toBe('draft');
  });

  it('mutasi tercatat di audit_logs dengan user_id yang benar (INSERT, UPDATE, soft delete)', async () => {
    const created = await withUser(() =>
      service.create(
        {
          name: `WP-13 Audit ${randomUUID()}`,
          location: 'Surabaya',
          contractType: 'one_time',
          status: 'Aktif',
          startDate: '2026-01-01',
        },
        userId,
      ),
    );
    projectIds.push(created.id);

    const insertLog = await raw.auditLog.findFirst({
      where: {
        tableName: 'projects',
        recordId: created.id,
        action: 'INSERT',
      },
    });
    expect(insertLog?.userId).toBe(userId);

    await withUser(() => service.update(created.id, { location: 'Sidoarjo' }));
    const updateLog = await raw.auditLog.findFirst({
      where: { tableName: 'projects', recordId: created.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(updateLog?.userId).toBe(userId);

    // Soft delete = UPDATE deleted_at lewat raw SQL bertransaksi (FR-DEL-8).
    await withUser(() => service.remove(created.id, userId));
    const deleteLog = await raw.auditLog.findFirst({
      where: { tableName: 'projects', recordId: created.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(deleteLog?.userId).toBe(userId);
    expect(
      (deleteLog?.newData as { deleted_at?: string } | null)?.deleted_at,
    ).toBeTruthy();
  });

  it('create dengan client_id tak dikenal → ditolak, bukan 500 generik', async () => {
    await expect(
      withUser(() =>
        service.create(
          {
            name: `WP-13 FK invalid ${randomUUID()}`,
            location: 'Surabaya',
            contractType: 'one_time',
            status: 'Aktif',
            startDate: '2026-01-01',
            clientId: randomUUID(),
          },
          userId,
        ),
      ),
    ).rejects.toThrow();
  });
});
