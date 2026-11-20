// acme-backend/src/audit/audit.db-spec.ts
//
// Integrasi (Postgres nyata, master §9.2) — WP-22, database test
// `acme_test_wp20` (fase-3-pelaporan-publikasi.md §2.11, dipakai bersama
// WP-20 — lihat §2.11). Membuktikan DoD paket ini (§4 WP-20+22):
//   (e) GET /audit sesudah update user -> daftar kunci response PERSIS 7
//       nama (Object.keys, bukan `!==`) — bukti langsung `password_hash`
//       (yang benar-benar tersimpan di `audit_logs.new_data` lewat trigger
//       DB, migration.sql baris 587) TAK PERNAH keluar lewat API (§2.2).
//   (f) admin -> 403 di GET /audit (pimpinan-saja, master §4.8).
//
// Jalankan (WAJIB prefix DATABASE_URL inline):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp20" \
//     npx jest --config test/jest-db.json --runInBand src/audit/audit.db-spec.ts
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { configureApp } from '../config/app-setup';
import { auditContextStorage } from './audit-context';
import { withAuditExtension } from './audit.extension';
import { authCookie } from '../../test/auth-cookie';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);

interface AuditListBody {
  data: Record<string, unknown>[];
  meta: { page: number; perPage: number; total: number };
}

const EXPECTED_KEYS = [
  'id',
  'createdAt',
  'userEmail',
  'userRole',
  'action',
  'tableName',
  'recordId',
].sort();

describe('GET /audit — integrasi Postgres nyata + guard sungguhan (WP-22)', () => {
  let app: INestApplication<App>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

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
  });

  async function createUser(role: Role, password: string) {
    const email = `wp22-audit-${randomUUID()}@acme.local`;
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await raw.user.create({
      data: {
        email,
        passwordHash,
        fullName: `WP-22 Audit Test ${role}`,
        role,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(user.id);
    return { id: user.id, email, password };
  }

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return authCookie(res, 'access_token');
  }

  it('sesudah UPDATE users (trigger menulis password_hash ke new_data), GET /audit membalas PERSIS 7 kunci (DoD e)', async () => {
    const password = 'PasswordAwal-123!';
    const pimpinan = await createUser(Role.pimpinan, password);

    // Update SENDIRI, terbungkus konteks audit -> baris audit_logs punya
    // user_id=pimpinan.id, table_name='users', new_data berisi password_hash
    // UTUH (trigger, migration.sql baris 587) — inilah kebocoran yang diuji.
    // `await` DI DALAM callback wajib. Bentuk `() => prisma.user.update(...)`
    // mengembalikan PrismaPromise yang BELUM dieksekusi; ia baru jalan saat
    // di-await pemanggil `run()` — yakni DI LUAR konteks AsyncLocalStorage.
    // Akibatnya `app.user_id` kosong, trigger menulis `audit_logs.user_id`
    // NULL, dan filter `?userId=` tak menemukan apa pun. Terbukti empiris:
    // versi tanpa await mengembalikan 0 baris.
    await auditContextStorage.run(
      { userId: pimpinan.id, clientIp: '127.0.0.1' },
      async () => {
        await prisma.user.update({
          where: { id: pimpinan.id },
          data: { fullName: 'WP-22 Audit Test pimpinan (updated)' },
        });
      },
    );

    const token = await login(pimpinan.email, password);

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ userId: pimpinan.id, tableName: 'users' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as AuditListBody;
    expect(body.data.length).toBeGreaterThan(0);
    for (const row of body.data) {
      expect(Object.keys(row).sort()).toEqual(EXPECTED_KEYS);
      expect(row).not.toHaveProperty('oldData');
      expect(row).not.toHaveProperty('newData');
    }
  });

  it('admin -> 403 di GET /audit (pimpinan-saja, master §4.8) (DoD f)', async () => {
    const password = 'PasswordAwal-123!';
    const admin = await createUser(Role.admin, password);
    const token = await login(admin.email, password);

    await request(app.getHttpServer())
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
