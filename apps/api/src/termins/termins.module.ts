// acme-backend/src/termins/termins.module.ts
import { Module } from '@nestjs/common';
import { TerminsController } from './termins.controller';
import { TerminPaymentsController } from './termin-payments.controller';
import { TerminPaymentsService } from './termin-payments.service';
import { TerminsService } from './termins.service';

/**
 * Diisi WP-17. Modul ini SUDAH terdaftar di app.module.ts (dibekukan
 * WP-00) — file ini TAK PERNAH menyentuhnya (master §3.4). `PrismaService`
 * tak perlu diimpor eksplisit: `PrismaModule` sudah `@Global()`.
 */
@Module({
  controllers: [TerminsController, TerminPaymentsController],
  providers: [TerminsService, TerminPaymentsService],
})
export class TerminsModule {}
