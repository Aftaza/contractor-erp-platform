// acme-backend/src/health/health.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * `GET /health` untuk healthcheck Docker (master §5.1). Terdaftar di
 * `app.module.ts` oleh WP-00, jadi route-nya disajikan aplikasi nyata yang
 * di-boot main.ts — terverifikasi lewat `npm run start:prod` (200) dan
 * test/bootstrap.e2e-spec.ts.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
