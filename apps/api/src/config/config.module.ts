// acme-backend/src/config/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation';

/**
 * Wrapper tipis @nestjs/config dengan validasi skema env (WP-01, master §5.1).
 * Terdaftar di `app.module.ts` oleh WP-00; `isGlobal: true` membuat
 * `ConfigService` tersedia lewat DI di semua modul (mis. WP-03 membaca
 * `JWT_ACCESS_SECRET`).
 *
 * INI SATU-SATUNYA PENEGAK FAIL-FAST ENV. `validate` dieksekusi saat modul ini
 * di-IMPORT (bukan saat di-init), jadi `import { AppModule }` di main.ts sudah
 * cukup memicunya — main.ts sengaja tak memanggil `validateEnv()` lagi.
 * Menghapus opsi `validate` di bawah = fail-fast hilang diam-diam;
 * config.module.spec.ts ada supaya itu ketahuan (sudah diuji lewat mutasi).
 *
 * `envFilePath` tak di-set: default @nestjs/config sudah
 * `resolve(process.cwd(), '.env')`, dan itu yang dipakai baik `npm run
 * start:prod` maupun container (WORKDIR = root app). Di Docker env datang dari
 * environment compose, bukan file — `.env` yang absen bukan error.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
    }),
  ],
})
export class AppConfigModule {}
