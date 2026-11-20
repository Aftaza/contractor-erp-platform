// acme-backend/src/audit/audit.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditLogListResponseDto } from './dto/audit-log-response.dto';
import { QueryAuditDto } from './dto/query-audit.dto';

/**
 * `GET /audit` — WP-22 (fase-3-pelaporan-publikasi.md §2.1, §4). PIMPINAN
 * SAJA (bukan admin — master §4.8 "audit_logs — read: pimpinan ✅ admin ❌").
 * Otorisasi SATU LAPIS: `@Roles('pimpinan')`. TAK ADA `if (role === ...)`.
 * Baris matriks: `test/authz/rows/audit.rows.ts`.
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles('pimpinan')
  @ApiOkResponse({ type: AuditLogListResponseDto })
  @Get()
  findAll(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }
}
