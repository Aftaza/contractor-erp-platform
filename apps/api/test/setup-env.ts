// acme-backend/test/setup-env.ts
//
// Disuntik lewat `setupFiles` jest (package.json + test/jest-e2e.json) — jalan
// SEBELUM modul apa pun di-import, yang penting karena
// `ConfigModule.forRoot({ validate })` mengeksekusi validasi env pada saat
// `app.module.ts` di-IMPORT, bukan saat di-init. Tanpa ini, file yang sekadar
// `import { AppModule }` menuntut env lengkap dan seluruh suite merah di CI
// (yang tak punya `.env` — file itu gitignored).
//
// Nilai di bawah dummy dan hanya untuk memuaskan skema env
// (src/config/env.validation.ts). Tak ada test unit/e2e yang benar-benar
// konek Postgres — test yang butuh DB nyata (`*.db-spec.ts`) memakai config
// terpisah `test/jest-db.json` yang SENGAJA tak memuat file ini, supaya
// DATABASE_URL asli dari lingkungan tetap dipakai.
//
// `??=` dipakai (bukan assign langsung) supaya env nyata dari CI/shell menang
// — setup ini hanya mengisi yang kosong, tak pernah menimpa.

process.env.DATABASE_URL ??=
  'postgresql://test:test@localhost:5432/acme_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-minimal-16-karakter';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-minimal-16-karakter';
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3001';
