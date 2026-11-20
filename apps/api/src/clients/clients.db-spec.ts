// acme-backend/src/clients/clients.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-11, database test
// `acme_test_wp11` (fase-2 §2.6). Menguji CRUD ClientsService lewat Prisma
// nyata, `createdBy` terisi dari user pemanggil, dan bukti FK
// `onDelete: SetNull`: menghapus klien yang dipakai proyek TIDAK menghapus
// proyeknya (fase-2 §4 WP-11 DoD).
//
// Pola sama seperti src/projects/projects.db-spec.ts: `auditContextStorage.run()`
// mensimulasikan konteks request TANPA boot HTTP+guard — gerbang
// role/otorisasi rute sudah diverifikasi terpisah oleh harness matriks
// (master §9.3, test/authz/).
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-2 §2.6):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp11" \
//     npx jest --config test/jest-db.json --runInBand src/clients/clients.db-spec.ts
import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { auditContextStorage } from '../audit/audit-context';
import { withAuditExtension } from '../audit/audit.extension';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from './clients.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);
const service = new ClientsService(prisma as unknown as PrismaService);

describe('ClientsService — integrasi Postgres nyata (WP-11)', () => {
  let userId: string;
  const clientIds: string[] = [];
  const projectIds: string[] = [];

  beforeAll(async () => {
    const user = await raw.user.create({
      data: {
        email: `wp11-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-11 Test User',
        role: 'pimpinan',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (projectIds.length > 0) {
      await raw.project.deleteMany({ where: { id: { in: projectIds } } });
    }
    if (clientIds.length > 0) {
      await raw.client.deleteMany({ where: { id: { in: clientIds } } });
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
        { name: `WP-11 CRUD ${randomUUID()}`, sector: 'Semen' },
        userId,
      ),
    );
    clientIds.push(created.id);

    expect(created.createdBy).toBe(userId);
    expect(created.sector).toBe('Semen');

    const found = await service.findOne(created.id);
    expect(found.name).toBe(created.name);

    const updated = await withUser(() =>
      service.update(created.id, { contactName: 'Budi' }),
    );
    expect(updated.contactName).toBe('Budi');
    expect(updated.name).toBe(created.name); // field lain tak ikut berubah

    await withUser(() => service.remove(created.id, userId));
    await expect(service.findOne(created.id)).rejects.toThrow();
  });

  it('list (GET /clients) mengembalikan bentuk {data, meta} master §3.2 dan menghormati paginasi', async () => {
    for (let i = 0; i < 3; i += 1) {
      const c = await withUser(() =>
        service.create({ name: `WP-11 List ${randomUUID()}` }, userId),
      );
      clientIds.push(c.id);
    }

    const page1 = await service.findAll({ page: 1, perPage: 2 });
    expect(page1.data.length).toBeLessThanOrEqual(2);
    expect(page1.meta).toEqual(
      expect.objectContaining({ page: 1, perPage: 2 }),
    );
    expect(page1.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('menghapus klien yang dipakai proyek = soft delete: proyek tetap merujuk klien itu (FR-DEL-4)', async () => {
    const client = await withUser(() =>
      service.create({ name: `WP-11 FK ${randomUUID()}` }, userId),
    );
    clientIds.push(client.id);

    const project = await raw.project.create({
      data: {
        name: `WP-11 FK Proyek ${randomUUID()}`,
        clientId: client.id,
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
        createdBy: userId,
      },
    });
    projectIds.push(project.id);

    await withUser(() => service.remove(client.id, userId));

    const foundProject = await raw.project.findUnique({
      where: { id: project.id },
      include: { client: true },
    });
    expect(foundProject?.clientId).toBe(client.id);
    expect(foundProject?.client?.deletedAt).not.toBeNull();
    expect(foundProject?.client?.deletedBy).toBe(userId);
    await expect(service.findOne(client.id)).rejects.toThrow(NotFoundException);
  });
});
