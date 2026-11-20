// acme-backend/src/rab/rab.module.ts
import { Module } from '@nestjs/common';
import { PolicyModule } from '../policy/policy.module';
import { RabController } from './rab.controller';
import { RabService } from './rab.service';

/**
 * Diisi WP-14. Modul ini SUDAH terdaftar di app.module.ts (dibekukan WP-00)
 * — file ini TAK PERNAH menyentuhnya (master §3.4). `PrismaService` tak
 * perlu diimpor eksplisit (`PrismaModule` @Global()); `PolicyModule`
 * diimpor eksplisit karena `RabService` butuh `PolicyService` lewat DI
 * (aturan admin ditolak saat `rab_status='approved'`, master §4.8) —
 * `PolicyModule` bukan @Global(), dan mengimpornya dua kali (di sini +
 * app.module.ts lewat PolicyModule sendiri) aman: Nest men-cache modul per
 * referensi, tak menginstansiasi ulang providernya.
 */
@Module({
  imports: [PolicyModule],
  controllers: [RabController],
  providers: [RabService],
})
export class RabModule {}
