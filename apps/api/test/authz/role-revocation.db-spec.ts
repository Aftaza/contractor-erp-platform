// acme-backend/test/authz/role-revocation.db-spec.ts
//
// Membuktikan rantai guard app-wide WP-04 (JwtAuthGuard -> MustChangePasswordAppGuard
// -> RolesGuard, dipasang lewat PolicyModule — src/policy/policy.module.ts) bekerja
// SUNGGUHAN lewat komposisi modul yang sama persis dipakai aplikasi nyata, bukan cuma
// unit test guard secara terisolasi. Dua skenario:
//
// 1) DoD WP-04 (fase-0-fondasi.md §WP-04, master §9.3): "token dengan role
//    lama setelah role diubah -> ditolak di operasi sensitif". RolesGuard
//    benar-benar menolak begitu role user berubah di DB, MESKI access token
//    yang dipakai belum kedaluwarsa dan tak pernah direfresh — karena
//    AuthVerifierService (src/auth) membaca `role` FRESH dari DB tiap
//    request (bukan dari klaim JWT beku).
// 2) MustChangePasswordAppGuard (src/policy/guards) benar-benar mengecualikan
//    /auth/change-password DAN tetap memblokir route lain (bahkan yang
//    role-nya diizinkan RolesGuard) selama must_change_password=true — kali
//    ini lewat PolicyModule sungguhan, melengkapi
//    src/auth/must-change-password.db-spec.ts (WP-03) yang memasang
//    MustChangePasswordGuard manual lewat @UseGuards lokal, bukan lewat
//    rantai APP_GUARD milik WP-04.
//
// Belum ada endpoint domain ber-@Roles() sungguhan di fase ini untuk
// menguji ini secara alami — pola di bawah SAMA seperti
// src/auth/must-change-password.db-spec.ts (controller dummy dipasang
// langsung di root TestingModule): membuktikan mekanisme guard bekerja
// sungguhan (JWT asli, DB asli, rantai guard app-wide sungguhan lewat
// PolicyModule), tanpa menambah endpoint spekulatif ke controller produksi.
import { randomUUID } from 'crypto';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppConfigModule } from '../../src/config/config.module';
import { configureApp } from '../../src/config/app-setup';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PolicyModule } from '../../src/policy/policy.module';
import { Roles } from '../../src/common/decorators/roles.decorator';
import { authCookie } from '../auth-cookie';

@Controller('_test-admin-only')
class DummyAdminOnlyController {
  @Roles('admin')
  @Get()
  ping() {
    return { ok: true };
  }
}

/** Bentuk body `POST /auth/login` (lihat AuthController.toResponseBody) — dinyatakan
 * ulang di sini secara sempit supaya `supertest`'s `res.body: any` tak mengalir ke
 * pemakaian di bawah tanpa tipe (`no-unsafe-member-access`). */
interface LoginResponseBody {
  user: { role: string };
}

const prisma = new PrismaClient();

describe('Rantai guard app-wide WP-04 (PolicyModule sungguhan, Postgres nyata)', () => {
  let app: INestApplication<App>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      // AppConfigModule + PrismaModule: keduanya @Global(), tapi hanya aktif
      // kalau modul pemiliknya diimpor di suatu tempat pada pohon modul yang
      // diuji (pola sama dengan must-change-password.db-spec.ts).
      // PolicyModule: memasang JwtAuthGuard + MustChangePasswordAppGuard +
      // RolesGuard sebagai APP_GUARD sungguhan (ini justru yang diuji), dan
      // meng-import AuthModule secara transitif (AuthController ikut
      // terdaftar, dipakai untuk login sungguhan di bawah).
      imports: [AppConfigModule, PrismaModule, PolicyModule],
      controllers: [DummyAdminOnlyController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  it('admin lolos endpoint @Roles("admin"); setelah role diubah ke staff_gudang di DB, TOKEN LAMA YANG SAMA ditolak (403)', async () => {
    const email = `wp04-role-revocation-${randomUUID()}@acme.local`;
    const password = 'PasswordAwal-123!';
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'WP-04 Role Revocation Test',
        role: Role.admin,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(user.id);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const loginBody = loginRes.body as LoginResponseBody;
    expect(loginBody.user.role).toBe('admin');
    const accessToken = authCookie(loginRes, 'access_token');

    // 1) Role masih admin -> endpoint @Roles('admin') lolos.
    await request(app.getHttpServer())
      .get('/api/v1/_test-admin-only')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // 2) Role dicabut LANGSUNG di DB (bukan lewat endpoint — belum ada
    //    endpoint admin di fase ini), TANPA login ulang / refresh token.
    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.staff_gudang },
    });

    // 3) SAMA access token (belum kedaluwarsa secara kriptografis) sekarang
    //    DITOLAK -> membuktikan RolesGuard menilai role TERKINI dari DB,
    //    bukan klaim beku di JWT.
    await request(app.getHttpServer())
      .get('/api/v1/_test-admin-only')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('mustChangePassword=true: DummyAdminOnlyController diblokir (403) meski role admin; /auth/change-password TETAP lolos; setelah ganti, token SAMA baru lolos DummyAdminOnlyController', async () => {
    const email = `wp04-mcp-chain-${randomUUID()}@acme.local`;
    const password = 'PasswordAwal-123!';
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'WP-04 MustChangePassword Chain Test',
        role: Role.admin,
        isActive: true,
        mustChangePassword: true,
      },
    });
    createdUserIds.push(user.id);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const accessToken = authCookie(loginRes, 'access_token');

    // 1) mustChangePassword=true -> MustChangePasswordAppGuard memblokir
    //    endpoint lain, MESKI role admin memenuhi @Roles('admin') dan
    //    RolesGuard sendiri akan mengizinkannya (guard ini jalan LEBIH DULU
    //    dalam rantai APP_GUARD milik PolicyModule).
    await request(app.getHttpServer())
      .get('/api/v1/_test-admin-only')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    // 2) /auth/change-password TETAP lolos — satu-satunya jalan keluar dari
    //    status ini (pengecualian eksplisit di MustChangePasswordAppGuard).
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ oldPassword: password, newPassword: 'PasswordSetelahGanti-99!' })
      .expect(200);

    // 3) SAMA access token (belum direfresh) sekarang lolos endpoint lain —
    //    membuktikan seluruh rantai (JwtAuthGuard -> MustChangePasswordAppGuard
    //    -> RolesGuard) membaca status TERKINI dari DB pada tiap request.
    await request(app.getHttpServer())
      .get('/api/v1/_test-admin-only')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
