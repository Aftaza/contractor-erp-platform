// acme-backend/src/auth/auth.flow.db-spec.ts
//
// Test integrasi (Postgres nyata — master §9.2, DoD WP-03 fase-0-fondasi.md
// §WP-03). Membangun aplikasi Nest SUNGGUHAN lewat AppModule + configureApp
// (fungsi yang SAMA dipakai main.ts, lihat test/bootstrap.e2e-spec.ts) — jadi
// argon2, JWT, cookie, ValidationPipe, dan exception filter benar-benar
// jalan, bukan mock. Jalankan: npm run test:db (butuh container acme-pg hidup).
//
// Tiap grup skenario (describe bersarang) punya app + koneksi sendiri
// (beforeAll/afterAll per grup) — SENGAJA, bukan satu app dipakai bersama
// untuk seluruh file. Alasan: ThrottlerModule (rate limit /auth/login) simpan
// state di memori per instance aplikasi. Kalau satu app dipakai bersama,
// panggilan login dari skenario lain ikut memakan kuota rate limit skenario
// brute-force (dan sebaliknya) — flaky, tergantung urutan/kecepatan eksekusi.
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';
import { AuthResult } from './auth.service';
import { authCookie } from '../../test/auth-cookie';

// Bentuk body respons AuthController.toResponseBody() — sama field dengan
// AuthResult produksi minus `refreshExpiresAt` (itu hanya dipakai utk cookie,
// tak diserikan ke body).
type AuthResponseBody = Pick<AuthResult, 'user'>;

const prisma = new PrismaClient();
const createdUserIds: string[] = [];

async function createTestUser(
  overrides: {
    role?: Role;
    isActive?: boolean;
    mustChangePassword?: boolean;
  } = {},
) {
  const email = `wp03-${randomUUID()}@acme.local`;
  const password = 'PasswordAwal-123!';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'WP-03 Test User',
      role: overrides.role ?? Role.staff_gudang,
      isActive: overrides.isActive ?? true,
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

describe('Auth flow (Postgres nyata) — WP-03', () => {
  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  describe('login — bentuk response & redaksi log', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await bootApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('sukses -> 200, cookie access_token & refresh_token httpOnly, body hanya user (SEC-2)', async () => {
      const { user, password } = await createTestUser();

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
        .expect(200);

      const body = res.body as AuthResponseBody;
      // SEC-2: token tak pernah di body (hanya cookie httpOnly).
      expect(Object.keys(body)).toEqual(['user']);
      expect(body.user).toMatchObject({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      // Password/hash TAK PERNAH muncul di response — DoD WP-03.
      expect(JSON.stringify(res.body)).not.toContain(password);
      expect(JSON.stringify(res.body)).not.toMatch(
        /passwordHash|password_hash/i,
      );

      const cookies = (res.headers['set-cookie'] as unknown as string[]) ?? [];
      const accessCookie = cookies.find((c) => c.startsWith('access_token='));
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
      expect(accessCookie).toMatch(/HttpOnly/i);
      expect(accessCookie).toMatch(/SameSite=Lax/i);
      expect(refreshCookie).toMatch(/HttpOnly/i);

      // `secure` TAK LAGI keras `true` — mengikuti NODE_ENV lewat
      // ConfigService (fase-1-vertikal-rab.md §2.4, WP-31: perbaikan cookie
      // `secure`, sebelumnya `true` keras dan menolak tersimpan di browser
      // sungguhan pada http://localhost). Proses test ini berjalan dengan
      // NODE_ENV development/test (bukan production — lihat .env / default
      // Jest), jadi atribut `Secure` SENGAJA tak ada di sini. Perilaku
      // `secure:true` saat NODE_ENV=production dibuktikan terpisah &
      // deterministik di auth.controller.spec.ts (unit, tak bergantung env
      // proses nyata).
      expect(accessCookie).not.toMatch(/Secure/i);
    });

    it('password salah -> 401 dengan pesan generik', async () => {
      const { user } = await createTestUser();

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'password-yang-salah-total' })
        .expect(401);

      const body = res.body as { message: string };
      expect(body.message).toBe('Email atau password salah');
      expect(res.body).not.toHaveProperty('stack');
    });

    it('DTO tak valid (email bukan format email) -> 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'bukan-email', password: 'apapun' })
        .expect(400);
    });

    it('response & LOG SUNGGUHAN login (sukses maupun gagal) tak memuat password/hash', async () => {
      const { user, password } = await createTestUser();
      const wrongPassword = 'password-keliru-yang-lain-123';

      const logSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
      let okBody: unknown;
      try {
        const okRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: user.email, password })
          .expect(200);
        okBody = okRes.body;

        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: wrongPassword })
          .expect(401);
      } finally {
        logSpy.mockRestore();
      }

      const dbUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });

      // Gabungkan SELURUH argumen console.log yang tercatat selama kedua
      // request di atas, cari string password/hash literal di mana pun —
      // bukan cuma memeriksa key yang diredaksi (itu sudah tugas
      // common/logger, dibekukan WP-00), tapi membuktikan tak ada jalur lain
      // yang membocorkannya.
      const loggedText = logSpy.mock.calls
        .map((call) => call.map((arg) => String(arg)).join(' '))
        .join('\n');

      expect(loggedText).not.toContain(password);
      expect(loggedText).not.toContain(wrongPassword);
      expect(loggedText).not.toContain(dbUser.passwordHash);

      expect(JSON.stringify(okBody)).not.toContain(password);
      expect(JSON.stringify(okBody)).not.toContain(dbUser.passwordHash);
    });
  });

  describe('refresh — rotasi token', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await bootApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('dirotasi: token lama DITOLAK setelah dipakai; token baru tetap berlaku', async () => {
      const { user, password } = await createTestUser();

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
        .expect(200);
      const refreshToken1 = authCookie(loginRes, 'refresh_token');

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken1}`)
        .expect(200);
      const refreshToken2 = authCookie(refreshRes, 'refresh_token');
      expect(Object.keys(refreshRes.body as object)).toEqual(['user']); // SEC-2
      expect(refreshToken2).not.toBe(refreshToken1);

      // Reuse token lama -> ditolak (baris di DB sudah revoked saat rotasi).
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken1}`)
        .expect(401);

      // Token baru hasil rotasi masih berlaku.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken2}`)
        .expect(200);
    });

    it('refresh lewat cookie (jalur web) juga berfungsi, tanpa header Authorization', async () => {
      const { user, password } = await createTestUser();

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
        .expect(200);

      // BUKAN request.agent() + cookie jar otomatis: kedua cookie di-set
      // `Secure` (benar, master §3.3 — server produksi selalu di belakang
      // proxy TLS, master §Arsitektur Target). superagent memakai `cookiejar`
      // yang meniru perilaku browser SUNGGUHAN: cookie ber-atribut `Secure`
      // TAK PERNAH dikirim ulang lewat koneksi non-HTTPS — dan server test
      // di sini (http.Server polos dari supertest, tanpa TLS) memang bukan
      // HTTPS. Diverifikasi langsung (bukan asumsi): repro minimal
      // express+supertest.agent() dengan cookie `secure:true` membuktikan
      // `req.headers.cookie` kosong pada request kedua. Melonggarkan
      // `secure:true` di controller supaya agent mau mengirim ulang cookie
      // akan MERUSAK jaminan keamanan produksi (dan meregresi test
      // 'sukses -> 200 ... cookie ... httpOnly' yang menegaskan atribut
      // `Secure` selalu ada). Jadi cookie diteruskan manual di sini — yang
      // diuji tetaplah hal sebenarnya: endpoint refresh membaca cookie
      // `refresh_token`, TANPA header Authorization.
      const cookies =
        (loginRes.headers['set-cookie'] as unknown as string[]) ?? [];
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      const refreshCookiePair = refreshCookie!.split(';')[0];

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookiePair)
        .expect(200);
    });

    it('refresh tanpa token sama sekali -> 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });

    it('logout mencabut refresh token; token yang sama tak bisa dipakai refresh lagi', async () => {
      const { user, password } = await createTestUser();

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
        .expect(200);
      const refreshToken = authCookie(loginRes, 'refresh_token');

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });
  });

  describe('is_active — dicek ulang ke DB tiap request', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await bootApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('is_active=false -> 401 meski access token masih valid secara kriptografis', async () => {
      const { user, password } = await createTestUser();

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password })
        .expect(200);
      const accessToken = authCookie(loginRes, 'access_token');

      // Token masih valid (belum kedaluwarsa) pada titik ini — buktikan dulu
      // endpoint terproteksi menerimanya.
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: password, newPassword: 'PasswordBaru-456!' })
        .expect(200);

      // Nonaktifkan user LANGSUNG di DB (belum ada endpoint admin di fase
      // ini), lalu pakai access token LAMA (masih dalam masa berlaku 15
      // menit) memanggil endpoint terproteksi lagi.
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'PasswordBaru-456!',
          newPassword: 'PasswordLain-789!',
        })
        .expect(401);
    });
  });

  describe('brute force /auth/login', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await bootApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('ditolak (429) setelah N percobaan dalam window rate limit', async () => {
      const { user } = await createTestUser();

      const statuses: number[] = [];
      // Sekuensial (bukan Promise.all) supaya urutan percobaan pasti, dan
      // supaya tak menyembunyikan kemungkinan race condition di counter
      // throttler.
      for (let i = 0; i < 6; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: 'selalu-salah' });
        statuses.push(res.status);
      }

      expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
      expect(statuses[5]).toBe(429);
    });
  });

  describe('SEC-1 — throttle login per IP (CF-Connecting-IP dari proxy tepercaya) + email', () => {
    let app: INestApplication<App>;
    const original = process.env.AUDIT_TRUSTED_PROXY_IPS;

    beforeAll(async () => {
      // Peer supertest = loopback; jadikan "proxy tepercaya" agar
      // CF-Connecting-IP dipakai sebagai IP klien.
      process.env.AUDIT_TRUSTED_PROXY_IPS = '127.0.0.1,::1';
      app = await bootApp();
    });

    afterAll(async () => {
      await app.close();
      if (original === undefined) delete process.env.AUDIT_TRUSTED_PROXY_IPS;
      else process.env.AUDIT_TRUSTED_PROXY_IPS = original;
    });

    const attempt = (ip: string, email: string, password = 'selalu-salah') =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('CF-Connecting-IP', ip)
        .send({ email, password });

    it('6× gagal dari satu IP → 429 hanya untuk IP itu; IP lain tak ikut terblokir', async () => {
      const { user, password } = await createTestUser();

      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        statuses.push((await attempt('198.51.100.1', user.email)).status);
      }
      expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
      expect(statuses[5]).toBe(429);

      // IP lain, user lain: tak terpengaruh kuota IP pertama.
      const other = await createTestUser();
      await attempt('198.51.100.2', other.user.email, other.password).expect(
        200,
      );
      // Email yang sama dari IP lain juga tak kena 429 (akun kini terkunci
      // FR-AUTH-5 → 401 generik, bukan 429).
      await attempt('198.51.100.2', user.email, password).expect(401);
    });

    it('IP palsu dari klien TAK tepercaya diabaikan (header tanpa proxy tepercaya)', async () => {
      process.env.AUDIT_TRUSTED_PROXY_IPS = '';
      const untrusted = await bootApp();
      try {
        const { user } = await createTestUser();
        const statuses: number[] = [];
        for (let i = 0; i < 6; i++) {
          const res = await request(untrusted.getHttpServer())
            .post('/api/v1/auth/login')
            .set('CF-Connecting-IP', `203.0.113.${i}`) // rotasi IP palsu
            .send({ email: user.email, password: 'selalu-salah' });
          statuses.push(res.status);
        }
        expect(statuses[5]).toBe(429);
      } finally {
        await untrusted.close();
        process.env.AUDIT_TRUSTED_PROXY_IPS = '127.0.0.1,::1';
      }
    });
  });

  describe('FR-AUTH-5 — lockout akun', () => {
    let app: INestApplication<App>;
    const original = process.env.AUDIT_TRUSTED_PROXY_IPS;

    beforeAll(async () => {
      process.env.AUDIT_TRUSTED_PROXY_IPS = '127.0.0.1,::1';
      app = await bootApp();
    });

    afterAll(async () => {
      await app.close();
      if (original === undefined) delete process.env.AUDIT_TRUSTED_PROXY_IPS;
      else process.env.AUDIT_TRUSTED_PROXY_IPS = original;
    });

    // IP berbeda tiap percobaan agar throttle tak ikut campur — yang diuji kunci akun.
    const login = (i: number, email: string, password: string) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('CF-Connecting-IP', `192.0.2.${i}`)
        .send({ email, password });

    it('5 gagal berturut → password benar pun 401 generik; unlock pimpinan → bisa login', async () => {
      const { user, password } = await createTestUser();

      for (let i = 0; i < 5; i++) {
        await login(i, user.email, 'selalu-salah').expect(401);
      }
      const locked = await login(10, user.email, password).expect(401);
      // Pesan sama persis dengan password salah — status kunci tak bocor.
      expect((locked.body as { message: string }).message).toBe(
        'Email atau password salah',
      );
      const row = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

      const boss = await createTestUser({ role: Role.pimpinan });
      const bossLogin = await login(20, boss.user.email, boss.password).expect(
        200,
      );
      const unlocked = await request(app.getHttpServer())
        .patch(`/api/v1/users/${user.id}/unlock`)
        .set('Authorization', `Bearer ${authCookie(bossLogin, 'access_token')}`)
        .expect(200);
      expect(
        (unlocked.body as { lockedUntil: unknown }).lockedUntil,
      ).toBeNull();

      await login(11, user.email, password).expect(200);
    });

    it('login sukses mereset hitungan gagal', async () => {
      const { user, password } = await createTestUser();
      for (let i = 0; i < 4; i++) {
        await login(30 + i, user.email, 'selalu-salah').expect(401);
      }
      await login(40, user.email, password).expect(200);
      const row = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(row.failedLoginCount).toBe(0);
    });
  });
});
