// acme-backend/src/users/users.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-10, database test
// `acme_test_wp10` (fase-2 §2.6). Boot AppModule SUNGGUHAN + configureApp
// (pola sama `project-tools.db-spec.ts`) supaya rantai guard
// (JwtAuthGuard -> RolesGuard) teruji lewat HTTP nyata, bukan mock — perlu
// utk membuktikan admin 403 di seluruh endpoint `users`.
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-2 §2.6):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp10" \
//     npx jest --config test/jest-db.json --runInBand src/users/users.db-spec.ts
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';
import { authCookie } from '../../test/auth-cookie';

interface LoginResponseBody {
  user: { id: string };
}

interface UserResponseBody {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

// Allowlist kunci — DoD fase-2 §4 WP-10: assert atas DAFTAR KUNCI, bukan
// sekadar `res.body.passwordHash === undefined` (itu tak menangkap field
// baru yang bocor di masa depan sekuat assert daftar).
const ALLOWED_USER_KEYS = [
  'id',
  'email',
  'fullName',
  'role',
  'isActive',
  'mustChangePassword',
  'lockedUntil',
  'createdAt',
  'updatedAt',
].sort();

const prisma = new PrismaClient();
const PASSWORD = 'PasswordAwal-123!';

async function bootApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

async function createUserAndLogin(
  app: INestApplication<App>,
  role: Role,
  createdUserIds: string[],
): Promise<{ token: string; refresh: string; userId: string }> {
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email: `wp10-${randomUUID()}@acme.local`,
      passwordHash,
      fullName: `WP-10 Test User ${role}`,
      role,
      mustChangePassword: false,
    },
  });
  createdUserIds.push(user.id);

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: PASSWORD })
    .expect(200);
  const body = res.body as LoginResponseBody;
  return {
    token: authCookie(res, 'access_token'),
    refresh: authCookie(res, 'refresh_token'),
    userId: body.user.id,
  };
}

describe('users (Postgres nyata) — WP-10', () => {
  let app: INestApplication<App>;
  const createdUserIds: string[] = [];

  let pimpinanToken: string;
  let adminToken: string;
  let targetId: string; // baris dipakai skenario admin-403 (target PATCH/DELETE/password)

  // Timeout 30s: boot AppModule PENUH + hash/login sekuensial melebihi
  // default jest 5000ms — waktu startup nyata (pelajaran WP-18).
  beforeAll(async () => {
    app = await bootApp();

    const pimpinan = await createUserAndLogin(
      app,
      Role.pimpinan,
      createdUserIds,
    );
    pimpinanToken = pimpinan.token;

    const admin = await createUserAndLogin(app, Role.admin, createdUserIds);
    adminToken = admin.token;

    // Target dipakai admin-403 (bukan dimodifikasi skenario itu — RolesGuard
    // menolak sebelum handler jalan).
    const target = await createUserAndLogin(
      app,
      Role.staff_gudang,
      createdUserIds,
    );
    targetId = target.userId;
  }, 30000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  it('admin DITOLAK 403 di seluruh 6 endpoint /users', async () => {
    const server = app.getHttpServer();
    const auth = () => `Bearer ${adminToken}`;

    await request(server)
      .get('/api/v1/users')
      .set('Authorization', auth())
      .expect(403);
    await request(server)
      .get(`/api/v1/users/${targetId}`)
      .set('Authorization', auth())
      .expect(403);
    await request(server)
      .post('/api/v1/users')
      .set('Authorization', auth())
      .send({
        email: `wp10-admin-tried-${randomUUID()}@acme.local`,
        password: 'PasswordPanjang-123',
        fullName: 'Ditolak',
        role: Role.staff_gudang,
      })
      .expect(403);
    await request(server)
      .patch(`/api/v1/users/${targetId}`)
      .set('Authorization', auth())
      .send({ fullName: 'Ditolak' })
      .expect(403);
    await request(server)
      .patch(`/api/v1/users/${targetId}/password`)
      .set('Authorization', auth())
      .send({ newPassword: 'PasswordPanjang-123' })
      .expect(403);
    await request(server)
      .delete(`/api/v1/users/${targetId}`)
      .set('Authorization', auth())
      .expect(403);
  });

  it('POST /users (pimpinan) → 201, response TIDAK memuat kunci passwordHash (assert daftar kunci), mustChangePassword=true', async () => {
    const email = `wp10-create-${randomUUID()}@acme.local`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({
        email,
        password: 'PasswordPanjang-123',
        fullName: 'User Baru WP-10',
        role: Role.staff_gudang,
      })
      .expect(201);
    const body = res.body as UserResponseBody;
    createdUserIds.push(body.id);

    // Assert DAFTAR KUNCI (allowlist), bukan sekadar `passwordHash === undefined`.
    expect(Object.keys(res.body as object).sort()).toEqual(ALLOWED_USER_KEYS);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash/i);

    expect(body.email).toBe(email);
    expect(body.mustChangePassword).toBe(true);
    expect(body.isActive).toBe(true);
  });

  it('GET /users & GET /users/:id (pimpinan) → user yang baru dibuat terlihat', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({
        email: `wp10-list-${randomUUID()}@acme.local`,
        password: 'PasswordPanjang-123',
        fullName: 'User List WP-10',
        role: Role.admin,
      })
      .expect(201);
    const createdBody = created.body as UserResponseBody;
    createdUserIds.push(createdBody.id);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .expect(200);
    expect(listRes.body).toHaveProperty('data');
    expect(listRes.body).toHaveProperty('meta');
    const ids = (listRes.body as { data: UserResponseBody[] }).data.map(
      (u) => u.id,
    );
    expect(ids).toContain(createdBody.id);

    const oneRes = await request(app.getHttpServer())
      .get(`/api/v1/users/${createdBody.id}`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .expect(200);
    expect((oneRes.body as UserResponseBody).email).toBe(createdBody.email);
  });

  it('PATCH /users/:id (pimpinan) → memperbarui fullName & role', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({
        email: `wp10-update-${randomUUID()}@acme.local`,
        password: 'PasswordPanjang-123',
        fullName: 'Sebelum Update',
        role: Role.staff_gudang,
      })
      .expect(201);
    const createdBody = created.body as UserResponseBody;
    createdUserIds.push(createdBody.id);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/users/${createdBody.id}`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({ fullName: 'Sesudah Update', role: Role.admin })
      .expect(200);
    const updatedBody = updated.body as UserResponseBody;

    expect(updatedBody.fullName).toBe('Sesudah Update');
    expect(updatedBody.role).toBe(Role.admin);
  });

  it('PATCH /users/:id/password (pimpinan) → hash berubah & mustChangePassword kembali true', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({
        email: `wp10-setpwd-${randomUUID()}@acme.local`,
        password: 'PasswordPanjang-123',
        fullName: 'Set Password WP-10',
        role: Role.staff_gudang,
      })
      .expect(201);
    const createdBody = created.body as UserResponseBody;
    createdUserIds.push(createdBody.id);

    const before = await prisma.user.findUniqueOrThrow({
      where: { id: createdBody.id },
    });

    // Simulasikan user itu sudah pernah ganti password sendiri (mustChangePassword
    // sengaja diflip false lewat DB langsung, tanpa endpoint) supaya perubahan
    // balik ke true di bawah benar-benar terbukti berasal dari endpoint ini,
    // bukan kebetulan nilai default yang tak pernah berubah.
    await prisma.user.update({
      where: { id: createdBody.id },
      data: { mustChangePassword: false },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${createdBody.id}/password`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({ newPassword: 'PasswordSetelahDiganti-456' })
      .expect(200);
    const body = res.body as UserResponseBody;
    expect(body.mustChangePassword).toBe(true);
    expect(Object.keys(res.body as object).sort()).toEqual(ALLOWED_USER_KEYS);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: createdBody.id },
    });
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(after.mustChangePassword).toBe(true);
  });

  it('DELETE /users/:id (pimpinan) → 204, baris TETAP ADA dengan isActive=false (soft-delete)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({
        email: `wp10-delete-${randomUUID()}@acme.local`,
        password: 'PasswordPanjang-123',
        fullName: 'Dihapus WP-10',
        role: Role.staff_gudang,
      })
      .expect(201);
    const createdBody = created.body as UserResponseBody;
    createdUserIds.push(createdBody.id);

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${createdBody.id}`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .expect(204);

    const row = await prisma.user.findUnique({
      where: { id: createdBody.id },
    });
    expect(row).not.toBeNull();
    expect(row?.isActive).toBe(false);
  });

  it('SEC-4: refresh token lama → 401 setelah reset password, ganti role, atau nonaktif', async () => {
    const server = app.getHttpServer();
    const auth = `Bearer ${pimpinanToken}`;
    const refreshWith = (token: string) =>
      request(server)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

    const changes: [string, (id: string) => request.Test][] = [
      [
        'reset password',
        (id) =>
          request(server)
            .patch(`/api/v1/users/${id}/password`)
            .set('Authorization', auth)
            .send({ newPassword: 'PasswordSetelahReset-789' }),
      ],
      [
        'ganti role',
        (id) =>
          request(server)
            .patch(`/api/v1/users/${id}`)
            .set('Authorization', auth)
            .send({ role: Role.admin }),
      ],
      [
        'nonaktif (PATCH isActive=false)',
        (id) =>
          request(server)
            .patch(`/api/v1/users/${id}`)
            .set('Authorization', auth)
            .send({ isActive: false }),
      ],
      [
        'nonaktif (DELETE)',
        (id) =>
          request(server)
            .delete(`/api/v1/users/${id}`)
            .set('Authorization', auth),
      ],
    ];

    for (const [label, change] of changes) {
      const victim = await createUserAndLogin(
        app,
        Role.staff_gudang,
        createdUserIds,
      );
      const status = (await change(victim.userId)).status;
      expect([label, status < 300]).toEqual([label, true]);
      const res = await refreshWith(victim.refresh);
      expect([label, res.status]).toEqual([label, 401]);
    }

    // Kontrol: perubahan non-sensitif (nama) TIDAK mencabut sesi.
    const control = await createUserAndLogin(
      app,
      Role.staff_gudang,
      createdUserIds,
    );
    await request(server)
      .patch(`/api/v1/users/${control.userId}`)
      .set('Authorization', auth)
      .send({ fullName: 'Ganti Nama Saja' })
      .expect(200);
    await refreshWith(control.refresh).expect(200);
  });

  it('PATCH /users/:id/unlock (pimpinan) → hitungan gagal & kunci dihapus (FR-AUTH-5)', async () => {
    const victim = await createUserAndLogin(
      app,
      Role.staff_gudang,
      createdUserIds,
    );
    await prisma.user.update({
      where: { id: victim.userId },
      data: { failedLoginCount: 3, lockedUntil: new Date(Date.now() + 60_000) },
    });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .expect(200);
    const listed = (
      listRes.body as { data: (UserResponseBody & { lockedUntil: string })[] }
    ).data.find((u) => u.id === victim.userId);
    expect(listed?.lockedUntil).toEqual(expect.any(String)); // ditandai terkunci

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${victim.userId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${victim.userId}/unlock`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .expect(200);

    const row = await prisma.user.findUniqueOrThrow({
      where: { id: victim.userId },
    });
    expect(row.failedLoginCount).toBe(0);
    expect(row.lockedUntil).toBeNull();
  });
});
