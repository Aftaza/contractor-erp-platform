// acme-backend/src/rab-import/rab-import.module.ts
import { Module } from '@nestjs/common';
import { PolicyModule } from '../policy/policy.module';
import { RabService } from '../rab/rab.service';
import { RabImportController } from './rab-import.controller';
import { RabImportService } from './rab-import.service';

/**
 * WP-15. Modul ini SUDAH terdaftar di app.module.ts (dibekukan WP-00) — file
 * ini TAK PERNAH menyentuhnya (master §3.4).
 *
 * `RabService` didaftarkan sebagai provider DI SINI (bukan diimpor dari
 * `RabModule`, yang tak meng-`exports: []`-kannya dan beku bagi paket ini) —
 * Nest DI mengizinkan kelas yang sama jadi provider independen di modul
 * berbeda; instance-nya terpisah dari punya `RabModule`, tapi keduanya
 * memakai `PrismaService`/`PolicyService` yang sama (global/`PolicyModule`)
 * jadi perilakunya identik. Ini menghindari duplikasi aturan bentuk pohon
 * (`assertValidNodeShape` dkk.) tanpa menyunting `src/rab/**` (beku, worker
 * lain paralel — fase-1-vertikal-rab.md file beku).
 */
@Module({
  imports: [PolicyModule],
  controllers: [RabImportController],
  providers: [RabImportService, RabService],
})
export class RabImportModule {}
