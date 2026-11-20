// acme-backend/src/uploads/uploads.module.ts
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * WP-21. Modul ini SUDAH terdaftar di app.module.ts (dibekukan WP-00) — file
 * ini TAK PERNAH menyentuhnya (master §3.4).
 */
@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
