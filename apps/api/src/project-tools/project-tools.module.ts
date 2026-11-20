// acme-backend/src/project-tools/project-tools.module.ts
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PolicyModule } from '../policy/policy.module';
import { ProjectToolsController } from './project-tools.controller';
import { ProjectToolsService } from './project-tools.service';

/**
 * Diisi WP-18 (fase-2-keuangan-operasional.md §4). Modul ini SUDAH
 * terdaftar di app.module.ts (dibekukan WP-00) — file ini TAK PERNAH
 * menyentuhnya (master §3.4). `PolicyModule` diimpor eksplisit karena
 * `ProjectToolsService` butuh `PolicyService` lewat DI (aturan staff_gudang
 * hanya boleh baris miliknya & pending, master §4.8) — `PolicyModule` bukan
 * @Global(), pola sama seperti `RabModule` (fase-1 WP-14).
 */
@Module({
  imports: [PolicyModule, NotificationsModule],
  controllers: [ProjectToolsController],
  providers: [ProjectToolsService],
})
export class ProjectToolsModule {}
