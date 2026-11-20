// acme-backend/src/health/health.controller.ts
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

/**
 * Bentuk response healthcheck. Kelas (bukan tipe inline) karena hanya kelas
 * yang punya wujud runtime untuk jadi schema OpenAPI — lihat
 * `scripts/check-openapi-contract.ts`.
 */
export class HealthResponseDto {
  status: 'ok';
}

/** Healthcheck Docker (master §5.1). Selalu publik — lihat catatan @Public(). */
@Controller('health')
export class HealthController {
  // @Public() dipasang sekarang meski JwtAuthGuard belum jadi APP_GUARD
  // global (itu tugas WP-04) — supaya begitu WP-04 mendaftarkannya, /health
  // tetap lolos tanpa ada yang perlu ingat mengubah file ini lagi.
  @Public()
  @ApiOkResponse({ type: HealthResponseDto })
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
