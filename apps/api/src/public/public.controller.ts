// acme-backend/src/public/public.controller.ts
import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PublicProjectsResponseDto } from './dto/public-project.dto';
import { QueryPublicProjectsDto } from './dto/query-public-projects.dto';
import { PublicService } from './public.service';

/**
 * `public` — WP-21 (fase-3-pelaporan-publikasi.md §2.6, §4 WP-21). Batas
 * kepercayaan: dikonsumsi situs company profile (repo terpisah) TANPA auth.
 * `@Public()` + `ThrottlerGuard` lokal (throttler didaftarkan di
 * `public.module.ts`, pola persis `auth.module.ts`/`auth.controller.ts`).
 * Baris matriks: `test/authz/rows/public.rows.ts`.
 */
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOkResponse({ type: PublicProjectsResponseDto })
  @Get('projects')
  findAll(@Query() query: QueryPublicProjectsDto) {
    return this.publicService.findAll(query);
  }
}
