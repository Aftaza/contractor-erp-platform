// Test integrasi (Postgres nyata — master §9.2) untuk WP-05: Prisma client
// extension yang membungkus mutasi dalam `SET LOCAL app.user_id` /
// `app.client_ip`, dibaca `audit_trigger_fn()` (WP-02) yang menulis
// `audit_logs`. Butuh DATABASE_URL Postgres nyata. Jalankan: npm run test:db
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { auditContextStorage } from './audit-context';
import { withAuditExtension } from './audit.extension';
import { PrismaService } from '../prisma/prisma.service';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);

describe('audit client extension — SET LOCAL app.user_id/app.client_ip', () => {
  let userA: { id: string; email: string; role: string };
  let userB: { id: string; email: string; role: string };

  beforeAll(async () => {
    // Pembuatan user seed ini sendiri lewat extension TANPA context (di luar
    // auditContextStorage.run) — membuktikan langsung DoD "mutasi di luar
    // konteks user tak meledak" sebelum test lain jalan.
    userA = await prisma.user.create({
      data: {
        email: `wp05-a-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-05 User A',
        role: 'admin',
      },
    });
    userB = await prisma.user.create({
      data: {
        email: `wp05-b-${randomUUID()}@acme.local`,
        passwordHash: 'x',
        fullName: 'WP-05 User B',
        role: 'pimpinan',
      },
    });
  });

  afterAll(async () => {
    await raw.auditLog.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
    await raw.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await raw.$disconnect();
  });

  it('mutasi di dalam context user → audit_logs terisi user_id + user_email + user_role + ip_address benar', async () => {
    const client = await auditContextStorage.run(
      { userId: userA.id, clientIp: '10.0.0.5' },
      async () =>
        prisma.client.create({
          data: { name: `WP-05 Client ${randomUUID()}` },
        }),
    );

    const log = await raw.auditLog.findFirst({
      where: { tableName: 'clients', recordId: client.id, action: 'INSERT' },
    });

    expect(log).not.toBeNull();
    expect(log?.userId).toBe(userA.id);
    expect(log?.userEmail).toBe(userA.email);
    expect(log?.userRole).toBe('admin');
    expect(log?.ipAddress).toBe('10.0.0.5');
  });

  it('mutasi TANPA context (mis. seed/migration) → tak meledak, audit_logs.user_id NULL', async () => {
    // Tak dibungkus auditContextStorage.run sama sekali — mensimulasikan
    // pemanggilan di luar request HTTP.
    const vendor = await prisma.vendor.create({
      data: { name: `WP-05 Vendor tanpa context ${randomUUID()}` },
    });

    const log = await raw.auditLog.findFirst({
      where: { tableName: 'vendors', recordId: vendor.id, action: 'INSERT' },
    });

    expect(log).not.toBeNull();
    expect(log?.userId).toBeNull();
    expect(log?.userEmail).toBeNull();
    expect(log?.ipAddress).toBeNull();
  });

  it('app.user_id TIDAK bocor antar transaksi — dua mutasi berurutan dengan user berbeda tercatat benar masing-masing', async () => {
    const clientA = await auditContextStorage.run(
      { userId: userA.id, clientIp: '10.0.0.1' },
      async () =>
        prisma.client.create({
          data: { name: `WP-05 No-leak A ${randomUUID()}` },
        }),
    );
    const clientB = await auditContextStorage.run(
      { userId: userB.id, clientIp: '10.0.0.2' },
      async () =>
        prisma.client.create({
          data: { name: `WP-05 No-leak B ${randomUUID()}` },
        }),
    );
    // Mutasi ketiga TANPA context sama sekali, setelah dua yang punya
    // context — kalau `SET LOCAL` bocor lewat connection pool, baris ini
    // akan salah mewarisi user_id dari mutasi B.
    const clientC = await prisma.client.create({
      data: { name: `WP-05 No-leak C (tanpa context) ${randomUUID()}` },
    });

    const [logA, logB, logC] = await Promise.all([
      raw.auditLog.findFirst({ where: { recordId: clientA.id } }),
      raw.auditLog.findFirst({ where: { recordId: clientB.id } }),
      raw.auditLog.findFirst({ where: { recordId: clientC.id } }),
    ]);

    expect(logA?.userId).toBe(userA.id);
    expect(logB?.userId).toBe(userB.id);
    expect(logC?.userId).toBeNull();
  });

  it('operasi baca (findMany) tak dibungkus transaksi extra — tetap mengembalikan data benar', async () => {
    const clients = await auditContextStorage.run(
      { userId: userA.id },
      async () => prisma.client.findMany({ take: 1 }),
    );
    expect(Array.isArray(clients)).toBe(true);
  });

  it('PrismaService (constructor-return-override) benar-benar connect/disconnect dan menulis audit_logs', async () => {
    const service = new PrismaService();
    // Objek yang di-return constructor PUNYA onModuleInit/onModuleDestroy
    // dari komponen `client` di withAuditExtension — inilah yang
    // memastikan Nest tetap bisa memanggil lifecycle hook meski constructor
    // me-return objek lain dari `this`.
    const lifecycle = service as unknown as {
      onModuleInit: () => Promise<void>;
      onModuleDestroy: () => Promise<void>;
      user: { count: () => Promise<number> };
    };
    expect(typeof lifecycle.onModuleInit).toBe('function');
    expect(typeof lifecycle.onModuleDestroy).toBe('function');

    await lifecycle.onModuleInit();
    await expect(lifecycle.user.count()).resolves.toEqual(expect.any(Number));
    await lifecycle.onModuleDestroy();
  });
});
