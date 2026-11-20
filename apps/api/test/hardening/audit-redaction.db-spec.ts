// acme-backend/test/hardening/audit-redaction.db-spec.ts
//
// Fase 4 WP-53 (fase-4-deploy-verifikasi.md §2.2, §4 WP-53) — utang I.
// Pola diwarisi dari src/audit/audit-extension.db-spec.ts (WP-05): Prisma
// client extension asli + auditContextStorage.run, TANPA boot AppModule
// (tak ada endpoint HTTP yang diuji di sini).
//
// Membuktikan migration 20260802120000_audit_redact_password_hash:
// `audit_trigger_fn()` tak lagi menulis "password_hash" ke
// audit_logs.old_data/new_data setelah UPDATE baris "users", DAN kolom
// lain (email, role, dst) tetap utuh — assert atas DAFTAR KUNCI persis,
// bukan cuma "password_hash hilang", supaya redaksi berlebihan juga
// ketahuan (§4 WP-53 butir 2).
//
// Jalankan (WAJIB prefix DATABASE_URL inline, JANGAN npm run test:db):
//   DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/acme_test_wp53" \
//     npx jest --config ./test/jest-db.json test/hardening/audit-redaction.db-spec.ts --silent
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { auditContextStorage } from '../../src/audit/audit-context';
import { withAuditExtension } from '../../src/audit/audit.extension';

const raw = new PrismaClient();
const prisma = withAuditExtension(raw);

// Kolom "users" persis skema (prisma/schema.prisma, beku) MINUS
// "password_hash" — inilah daftar kunci yang wajib ada utuh di old_data/new_data.
const EXPECTED_KEYS_WITHOUT_PASSWORD_HASH = [
  'id',
  'email',
  'full_name',
  'role',
  'is_active',
  'must_change_password',
  'failed_login_count',
  'locked_until',
  'created_at',
  'updated_at',
].sort();

describe('audit_trigger_fn() — redaksi password_hash (WP-53, migration baru)', () => {
  let userId: string;

  afterAll(async () => {
    if (userId) {
      await raw.auditLog.deleteMany({ where: { recordId: userId } });
      await raw.user.deleteMany({ where: { id: userId } });
    }
    await raw.$disconnect();
  });

  it('UPDATE users -> audit_logs.old_data/new_data tanpa password_hash, kunci lain utuh', async () => {
    const email = `wp53-redaction-${randomUUID()}@acme.local`;

    const user = await auditContextStorage.run(
      { userId: undefined },
      async () =>
        prisma.user.create({
          data: {
            email,
            passwordHash: 'irrelevant-hash-for-this-test',
            fullName: 'WP-53 Redaction Test',
            role: 'staff_gudang',
          },
        }),
    );
    userId = user.id;

    await auditContextStorage.run({ userId: user.id }, async () =>
      prisma.user.update({
        where: { id: user.id },
        data: { fullName: 'WP-53 Redaction Test (updated)' },
      }),
    );

    const log = await raw.auditLog.findFirst({
      where: { tableName: 'users', recordId: user.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).not.toBeNull();
    const oldData = log?.oldData as Record<string, unknown>;
    const newData = log?.newData as Record<string, unknown>;

    expect(Object.keys(oldData).sort()).toEqual(
      EXPECTED_KEYS_WITHOUT_PASSWORD_HASH,
    );
    expect(Object.keys(newData).sort()).toEqual(
      EXPECTED_KEYS_WITHOUT_PASSWORD_HASH,
    );

    expect(oldData.password_hash).toBeUndefined();
    expect(newData.password_hash).toBeUndefined();
    expect(newData.email).toBe(email);
    expect(newData.role).toBe('staff_gudang');
  }, 60_000);
});
