// acme-backend/src/public/public.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PUBLIC_THROTTLE_LIMIT, PUBLIC_THROTTLE_TTL_MS } from './constants';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

/**
 * WP-21. Modul ini SUDAH terdaftar di app.module.ts (dibekukan WP-00) — file
 * ini TAK PERNAH menyentuhnya (master §3.4).
 *
 * `ThrottlerModule.forRoot` LOKAL (bukan global — itu app.module.ts, beku),
 * pola persis `auth/auth.module.ts:19`. Rate limit `/public/projects`
 * (fase-3-pelaporan-publikasi.md §2.6, master §7.1) — endpoint publik tanpa
 * auth menghadap internet.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      { ttl: PUBLIC_THROTTLE_TTL_MS, limit: PUBLIC_THROTTLE_LIMIT },
    ]),
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
