// acme-backend/src/projects/projects.module.ts
import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

/**
 * Diisi WP-13. Modul ini SUDAH terdaftar di app.module.ts (dibekukan
 * WP-00) — file ini TAK PERNAH menyentuhnya (master §3.4). `PrismaService`
 * tak perlu diimpor eksplisit: `PrismaModule` sudah `@Global()`.
 */
@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
