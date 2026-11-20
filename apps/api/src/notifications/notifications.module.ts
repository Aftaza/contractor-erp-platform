// acme-backend/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Diisi WP-19 (fase-2-keuangan-operasional.md §4). Modul ini SUDAH
 * terdaftar di app.module.ts (dibekukan WP-00) — file ini TAK PERNAH
 * menyentuhnya (master §3.4). `NotificationsService` di-export supaya
 * `ProjectToolsModule` (WP-18, fase-2 §2.3 — pengecualian kepemilikan
 * eksplisit) bisa meng-inject-nya lewat DI untuk memanggil `notifyRole`.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
