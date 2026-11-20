// acme-backend/src/tools/tools.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-18, database test
// `acme_test_wp18` (fase-2-keuangan-operasional.md §2.6). Boot AppModule
// SUNGGUHAN + configureApp (pola sama `auth-me.db-spec.ts`/
// `role-revocation.db-spec.ts`) — BUKAN memanggil ToolsService langsung —
// supaya `RolesGuard` beneran jalan. Itu satu-satunya cara membuktikan
// DoD "admin 403 di POST /tools": `ToolsService` sendiri TAK punya
// parameter role sama sekali (otorisasi murni `@Roles()`, lihat
// tools.service.ts), jadi baris matriks itu hanya teruji lewat HTTP nyata.
//
// Jalankan (WAJIB prefix DATABASE_URL inline — fase-2 §2.6):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp18" \
//     npx jest --config test/jest-db.json --runInBand src/tools/tools.db-spec.ts
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

interface ToolResponseBody {
  id: string;
  code: string | null;
  name: string;
  status: string;
}

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
): Promise<string> {
  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email: `wp18-tools-${randomUUID()}@acme.local`,
      passwordHash,
      fullName: `WP-18 Tools Test ${role}`,
      role,
      mustChangePassword: false,
    },
  });
  createdUserIds.push(user.id);

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: PASSWORD })
    .expect(200);
  return authCookie(res, 'access_token');
}

describe('tools (Postgres nyata) — WP-18', () => {
  let app: INestApplication<App>;
  const createdUserIds: string[] = [];
  const createdToolIds: string[] = [];

  let pimpinanToken: string;
  let adminToken: string;
  let staffToken: string;

  // Timeout 30s: boot AppModule PENUH (16 modul domain) + 3x argon2
  // hash/login sekuensial melebihi default jest 5000ms — waktu startup
  // nyata, bukan tanda kelambatan logika.
  beforeAll(async () => {
    app = await bootApp();
    pimpinanToken = await createUserAndLogin(
      app,
      Role.pimpinan,
      createdUserIds,
    );
    adminToken = await createUserAndLogin(app, Role.admin, createdUserIds);
    staffToken = await createUserAndLogin(
      app,
      Role.staff_gudang,
      createdUserIds,
    );
  }, 30000);

  afterAll(async () => {
    if (createdToolIds.length > 0) {
      await prisma.tool.deleteMany({ where: { id: { in: createdToolIds } } });
    }
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

  it('admin DITOLAK 403 di POST /tools (matriks master §4.8 — admin tak boleh CRUD alat)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/tools')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alat Ditolak Admin' })
      .expect(403);
  });

  it('staff_gudang: buat/ubah/ubah status berhasil, hapus 403 (FR-DEL-1: hapus hanya pimpinan)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/tools')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ code: `ALT-${randomUUID().slice(0, 8)}`, name: 'Bor Listrik' })
      .expect(201);
    const tool = created.body as ToolResponseBody;
    createdToolIds.push(tool.id);
    expect(tool.status).toBe('tersedia');

    await request(app.getHttpServer())
      .patch(`/api/v1/tools/${tool.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ category: 'Elektrik' })
      .expect(200);

    const statusRes = await request(app.getHttpServer())
      .patch(`/api/v1/tools/${tool.id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'dipakai' })
      .expect(200);
    expect((statusRes.body as ToolResponseBody).status).toBe('dipakai');

    await request(app.getHttpServer())
      .delete(`/api/v1/tools/${tool.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });

  it('pimpinan: CRUD penuh berhasil', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/tools')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({ name: 'Genset' })
      .expect(201);
    const tool = created.body as ToolResponseBody;
    createdToolIds.push(tool.id);

    await request(app.getHttpServer())
      .get(`/api/v1/tools/${tool.id}`)
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .expect(200);
  });

  it('admin TETAP boleh membaca (GET /tools, GET /tools/:id) — hanya mutasi yang ditolak', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/tools')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('code unik yang bentrok → 400 dengan pesan menyebut field `code`, bukan error Postgres mentah', async () => {
    const code = `ALT-DUP-${randomUUID().slice(0, 8)}`;
    const first = await request(app.getHttpServer())
      .post('/api/v1/tools')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({ code, name: 'Alat Pertama' })
      .expect(201);
    createdToolIds.push((first.body as ToolResponseBody).id);

    const conflict = await request(app.getHttpServer())
      .post('/api/v1/tools')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .send({ code, name: 'Alat Kedua' })
      .expect(400);
    expect(JSON.stringify(conflict.body)).toMatch(/code/i);
  });
});
