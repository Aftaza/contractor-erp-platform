// acme-backend/src/auth/must-change-password.db-spec.ts
//
// Membuktikan MustChangePasswordGuard (src/auth/guards/must-change-password.guard.ts)
// benar-benar memblokir akses selama must_change_password=true, DoD WP-03.
//
// Belum ada endpoint domain sungguhan di fase ini untuk menguji ini secara
// alami (WP-04 baru memasang rantai guard app-wide). Pola di bawah — modul +
// controller dummy dipasang langsung di root TestingModule — SAMA seperti
// test/bootstrap.e2e-spec.ts (SampleController/BoomController): membuktikan
// mekanisme guard bekerja sungguhan (JWT asli, DB asli), tanpa menambah
// endpoint spekulatif ke AuthController produksi.
//
// Root testing module import [AppConfigModule, PrismaModule, AuthModule]
// (bukan AppModule penuh) — AuthVerifierService butuh ConfigService +
// PrismaService yang keduanya @Global(), tapi hanya aktif kalau modul
// pemiliknya diimpor di suatu tempat pada pohon modul yang diuji.
import { randomUUID } from 'crypto';
import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from './auth.module';
import { MustChangePasswordGuard } from './guards/must-change-password.guard';
import { AppConfigModule } from '../config/config.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { configureApp } from '../config/app-setup';
import { AuthResult } from './auth.service';
import { authCookie } from '../../test/auth-cookie';

// Sama seperti di auth.flow.db-spec.ts: bentuk body respons login, minus
// `refreshExpiresAt` (hanya dipakai utk cookie, tak diserikan ke body).
type AuthResponseBody = Pick<AuthResult, 'user'>;

@Controller('_test-protected')
class DummyProtectedController {
  @UseGuards(JwtAuthGuard, MustChangePasswordGuard)
  @Get()
  ping() {
    return { ok: true };
  }
}

const prisma = new PrismaClient();

describe('MustChangePasswordGuard (Postgres nyata) — WP-03', () => {
  let app: INestApplication<App>;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule, AuthModule],
      controllers: [DummyProtectedController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (userId) {
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  it('memblokir akses (403) selama must_change_password=true, lalu mengizinkan setelah diganti — TANPA token baru', async () => {
    const email = `wp03-mcp-${randomUUID()}@acme.local`;
    const password = 'PasswordAwal-123!';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'WP-03 MustChangePassword Test',
        role: 'staff_gudang',
        mustChangePassword: true,
      },
    });
    userId = user.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const loginBody = loginRes.body as AuthResponseBody;
    expect(loginBody.user.mustChangePassword).toBe(true);
    const accessToken = authCookie(loginRes, 'access_token');

    // 1) Endpoint terproteksi umum -> 403 selama must_change_password true.
    await request(app.getHttpServer())
      .get('/api/v1/_test-protected')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    // 2) /auth/change-password TETAP bisa diakses (jalan keluar dari status
    //    ini) — tak diberi MustChangePasswordGuard secara sengaja.
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ oldPassword: password, newPassword: 'PasswordSetelahGanti-99!' })
      .expect(200);

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(dbUser.mustChangePassword).toBe(false);

    // 3) SAMA access token (belum kedaluwarsa, tak direfresh) sekarang lolos
    //    — membuktikan verify() membaca status TERKINI dari DB, bukan klaim
    //    beku di JWT.
    await request(app.getHttpServer())
      .get('/api/v1/_test-protected')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
