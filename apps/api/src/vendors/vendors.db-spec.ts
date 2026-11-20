// acme-backend/src/vendors/vendors.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-12, database test
// `acme_test_wp11` (fase-2 §2.6 — WP-11+12 satu worker, satu database).
// Menguji CRUD VendorsService lewat Prisma nyata dan `createdBy` terisi dari
// user pemanggil.
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-2 §2.6):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp11" \
//     npx jest --config test/jest-db.json --runInBand src/vendors/vendors.db-spec.ts
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { auditContextStorage } from '../audit/audit-context';
import { withAuditExtension } from '../audit/audit.extension';
import { PrismaService } from '../prisma/prisma.service';
import { VendorsService } from './vendors.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);
const service = new VendorsService(prisma as unknown as PrismaService);

describe('VendorsService — integrasi Postgres nyata (WP-12)', () => {
  let userId: string;
  const vendorIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `wp12-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-12 Test User',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (vendorIds.length > 0) {
      await raw.vendor.deleteMany({ where: { id: { in: vendorIds } } });
    }
    await raw.auditLog.deleteMany({ where: { userId } });
    await raw.user.delete({ where: { id: userId } });
    await raw.$disconnect();
  });

  function withUser<T>(fn: () => Promise<T>): Promise<T> {
    return auditContextStorage.run({ userId, clientIp: '127.0.0.1' }, fn);
  }

  it('create → findOne → update → remove: CRUD penuh terhadap Postgres nyata, createdBy dari user pemanggil', async () => {
    const created = await withUser(() =>
      service.create(
        { name: `WP-12 CRUD ${randomUUID()}`, category: 'Material' },
        userId,
      ),
    );
    vendorIds.push(created.id);

    expect(created.createdBy).toBe(userId);
    expect(created.category).toBe('Material');

    const found = await service.findOne(created.id);
    expect(found.name).toBe(created.name);

    const updated = await withUser(() =>
      service.update(created.id, { contactName: 'Siti' }),
    );
    expect(updated.contactName).toBe('Siti');
    expect(updated.name).toBe(created.name); // field lain tak ikut berubah

    await withUser(() => service.remove(created.id, userId));
    await expect(service.findOne(created.id)).rejects.toThrow();
  });

  it('list (GET /vendors) mengembalikan bentuk {data, meta} master §3.2 dan menghormati paginasi', async () => {
    for (let i = 0; i < 3; i += 1) {
      const v = await withUser(() =>
        service.create({ name: `WP-12 List ${randomUUID()}` }, userId),
      );
      vendorIds.push(v.id);
    }

    const page1 = await service.findAll({ page: 1, perPage: 2 });
    expect(page1.data.length).toBeLessThanOrEqual(2);
    expect(page1.meta).toEqual(
      expect.objectContaining({ page: 1, perPage: 2 }),
    );
    expect(page1.meta.total).toBeGreaterThanOrEqual(3);
  });
});
