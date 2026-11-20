// acme-backend/src/uploads/uploads.db-spec.ts
//
// Integrasi (app Nest sungguhan + guard sungguhan) — WP-21, database test
// `acme_test_wp21` (fase-3-pelaporan-publikasi.md §2.11). Butuh DB karena
// login/JWT memverifikasi user ke Postgres, meski endpoint uploads sendiri
// tak menyentuh tabel apa pun.
//
// Yang dibuktikan (§2.7, DoD §4 WP-21):
//   - path traversal ditolak 404 (BUKAN 400 — jangan bocorkan struktur)
//   - mime di luar whitelist ditolak 400
//   - alur sukses: unggah -> path pola generate -> file terbaca anonim
//
// Jalankan (WAJIB prefix DATABASE_URL inline):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp21" \
//     npx jest --config test/jest-db.json --runInBand src/uploads/uploads.db-spec.ts
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';
import { UPLOAD_FILENAME_PATTERN } from './upload-filename.util';
import { authCookie } from '../../test/auth-cookie';

const raw = new PrismaClient();

// Direktori sementara supaya test tak mengotori `acme-backend/uploads/`.
// Di-set SEBELUM AppModule dibangun — UploadsService membacanya saat init.
const tempUploadsDir = mkdtempSync(join(tmpdir(), 'acme-uploads-test-'));
process.env.UPLOADS_DIR = tempUploadsDir;

/** PNG 1×1 valid — cukup untuk membuktikan alur tulis/baca. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('uploads — path traversal & whitelist mime (WP-21)', () => {
  let app: INestApplication<App>;
  const createdUserIds: string[] = [];
  let pimpinanToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    pimpinanToken = await createUserAndLogin(Role.pimpinan);
    adminToken = await createUserAndLogin(Role.admin);
    // Boot Nest + 2x argon2id hash + 2x login > 5 detik default Jest, dan
    // `test/jest-db.json` tak menyetel testTimeout. Timeout per-hook di sini,
    // bukan di config bersama — file inilah yang butuh, bukan semua db-spec.
  }, 60_000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await raw.auditLog.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await raw.refreshToken.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await raw.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await raw.$disconnect();
    await app.close();
    rmSync(tempUploadsDir, { recursive: true, force: true });
  });

  async function createUserAndLogin(role: Role): Promise<string> {
    const email = `wp21-uploads-${randomUUID()}@acme.local`;
    const password = 'PasswordAwal-123!';
    const user = await raw.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        fullName: `WP-21 Uploads Test ${role}`,
        role,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(user.id);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return authCookie(res, 'access_token');
  }

  it('unggah PNG -> path pola generate, lalu terbaca anonim (alur sukses)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .attach('file', PNG_1X1, {
        filename: 'evil.php.jpg',
        contentType: 'image/png',
      })
      .expect(201);

    const { path } = res.body as { path: string };
    const filename = path.replace('/uploads/', '');

    // Nama asli klien TAK ikut; ekstensi dari MIME (png), bukan dari ".jpg".
    expect(path.startsWith('/uploads/')).toBe(true);
    expect(filename).toMatch(UPLOAD_FILENAME_PATTERN);
    expect(path).not.toContain('evil');
    expect(path).not.toContain('php');

    // Dibaca TANPA auth — persis cara situs publik memuat foto portfolio.
    const get = await request(app.getHttpServer())
      .get(`/api/v1/uploads/${filename}`)
      .expect(200);
    expect(get.headers['content-type']).toContain('image/png');
  });

  it('GET /uploads/../.env -> 404 (bukan 400, bukan isi file)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/uploads/../.env')
      .expect(404);
  });

  it('GET /uploads/..%2f..%2f.env (ter-encode) -> 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/uploads/..%2f..%2f.env')
      .expect(404);
  });

  it('unggah application/pdf -> 400 (mime di luar whitelist)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .attach('file', Buffer.from('%PDF-1.7 bukan gambar'), {
        filename: 'dokumen.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });

  it('unggah .exe (MZ) ber-Content-Type image/png -> 400 (magic byte tak cocok, §2.8 WP-53)', async () => {
    const EXE = Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary');
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${pimpinanToken}`)
      .attach('file', EXE, {
        filename: 'evil.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('admin -> 403 di POST /uploads (pimpinan-saja, §2.7)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PNG_1X1, {
        filename: 'foto.png',
        contentType: 'image/png',
      })
      .expect(403);
  });
});
