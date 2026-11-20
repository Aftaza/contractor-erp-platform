// acme-backend/src/tools/tools.module.ts
import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

/**
 * Diisi WP-18 (fase-2-keuangan-operasional.md §4). Modul ini SUDAH
 * terdaftar di app.module.ts (dibekukan WP-00) — file ini TAK PERNAH
 * menyentuhnya (master §3.4). `PrismaService` tak perlu diimpor eksplisit
 * (`PrismaModule` @Global()). `ToolsService` tak butuh `PolicyService` —
 * otorisasi murni `@Roles()` (lihat tools.service.ts).
 */
@Module({
  controllers: [ToolsController],
  providers: [ToolsService],
})
export class ToolsModule {}
