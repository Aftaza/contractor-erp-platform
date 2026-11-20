// acme-backend/src/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditContextInterceptor } from './audit-context.interceptor';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * WP-05 — jejak audit. Modul ini SUDAH terdaftar di app.module.ts
 * (dibekukan WP-00); worker WP-05 hanya mengisi file di folder ini, TAK
 * PERNAH menyentuh app.module.ts (master §3.4).
 *
 * `AuditContextInterceptor` didaftarkan sebagai `APP_INTERCEPTOR` DARI SINI
 * (pola Nest resmi untuk menyumbang provider global tanpa mengedit modul
 * root) — mengisi AsyncLocalStorage per-request yang dibaca Prisma client
 * extension (audit.extension.ts, dipasang lewat prisma.service.ts).
 *
 * `GET /audit` (baca log, pimpinan-saja) — WP-22 (fase-3-pelaporan-publikasi.md
 * §2.1). WP-22 diberi hak eksklusif menambahkan `controllers`/provider
 * `AuditService` DI SINI SAJA — baris `APP_INTERCEPTOR` milik WP-05 di atas
 * TAK disentuh.
 */
@Module({
  controllers: [AuditController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditContextInterceptor },
    AuditService,
  ],
})
export class AuditModule {}
