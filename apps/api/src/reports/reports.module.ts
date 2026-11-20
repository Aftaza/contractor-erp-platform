// acme-backend/src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * Diisi WP-20. Modul ini SUDAH terdaftar di app.module.ts (dibekukan
 * WP-00) — file ini TAK PERNAH menyentuhnya (master §3.4). `PrismaService`
 * tak perlu diimpor eksplisit: `PrismaModule` sudah `@Global()`.
 */
@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
