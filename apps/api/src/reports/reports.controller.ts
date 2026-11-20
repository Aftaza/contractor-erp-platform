// acme-backend/src/reports/reports.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { QueryReportsDto } from './dto/query-reports.dto';
import { ReportFinanceResponseDto } from './dto/report-finance-response.dto';
import { ReportProgressListResponseDto } from './dto/report-progress-response.dto';
import { ReportProjectListResponseDto } from './dto/report-project-response.dto';
import { ReportVendorListResponseDto } from './dto/report-vendor-response.dto';
import { ReportsService } from './reports.service';

/**
 * `reports` — WP-20 (fase-3-pelaporan-publikasi.md §4) + `vendors` (FR-FIN-3). Tiga endpoint keuangan,
 * bukan lima (§2.4) — `byClient`/`byMonth` ikut di `GET /reports/finance`.
 * Otorisasi SATU LAPIS: `@Roles('pimpinan','admin')`. TAK ADA
 * `if (role === ...)`. Baris matriks: `test/authz/rows/reports.rows.ts`.
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ReportProjectListResponseDto })
  @Get('projects')
  projects(@Query() query: QueryReportsDto) {
    return this.reportsService.projects(query);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ReportFinanceResponseDto })
  @Get('finance')
  finance() {
    return this.reportsService.finance();
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ReportVendorListResponseDto })
  @Get('vendors')
  vendors(@Query() query: QueryReportsDto) {
    return this.reportsService.vendors(query);
  }

  @Roles('pimpinan', 'admin')
  @ApiOkResponse({ type: ReportProgressListResponseDto })
  @Get('progress')
  progress(@Query() query: QueryReportsDto) {
    return this.reportsService.progress(query);
  }
}
