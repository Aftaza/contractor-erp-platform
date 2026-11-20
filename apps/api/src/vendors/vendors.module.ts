// acme-backend/src/vendors/vendors.module.ts
import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

/**
 * Diisi WP-12. Modul ini SUDAH terdaftar di app.module.ts (dibekukan
 * WP-00) — file ini TAK PERNAH menyentuhnya (master §3.4). `PrismaService`
 * tak perlu diimpor eksplisit: `PrismaModule` sudah `@Global()`.
 */
@Module({
  controllers: [VendorsController],
  providers: [VendorsService],
})
export class VendorsModule {}
