// acme-backend/src/auth/auth-me.db-spec.ts
//
// Test integrasi (Postgres nyata) — GET /auth/me (tambahan scope integrator,
// lihat komentar di auth.controller.ts handler `me()`). Pola sama dengan
// auth.flow.db-spec.ts: AppModule + configureApp sungguhan (bukan mock),
// supaya guard chain (JwtAuthGuard -> MustChangePasswordAppGuard) benar-benar
// jalan. Jalankan: npm run test:db (butuh container acme-pg hidup) — atau
// per-file lewat jest-db.json (fase-1-vertikal-rab.md §2.1).
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

const prisma = new PrismaClient();
const createdUserIds: string[] = [];

async function createTestUser(
  overrides: { role?: Role; mustChangePassword?: boolean } = {},
) {
  const email = `wp31-me-${randomUUID()}@acme.local`;
  const password = 'PasswordAwal-123!';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'WP-31 Me Test',
      role: overrides.role ?? Role.staff_gudang,
      mustChangePassword: overrides.mustChangePassword ?? false,
    },
  });
  createdUserIds.push(user.id);
  return { user, password };
}

async function bootApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

describe('GET /auth/me (Postgres nyata) — WP-31', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('anonim (tanpa token) -> 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('user terautentikasi mendapat data dirinya sendiri, bentuk {id,name,email,role,mustChangePassword}', async () => {
    const { user, password } = await createTestUser({ role: Role.pimpinan });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password })
      .expect(200);
    const accessToken = authCookie(loginRes, 'access_token');

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual({
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      mustChangePassword: false,
    });
  });

  it('response TAK PERNAH memuat password_hash atau field internal lain', async () => {
    const { user, password } = await createTestUser();

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password })
      .expect(200);
    const accessToken = authCookie(loginRes, 'access_token');

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('isActive');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash/i);
  });

  it('mustChangePassword=true -> 403 (MustChangePasswordAppGuard, TAK dikecualikan untuk /auth/me — keputusan sadar)', async () => {
    const { user, password } = await createTestUser({
      mustChangePassword: true,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password })
      .expect(200);
    const accessToken = authCookie(loginRes, 'access_token');

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
