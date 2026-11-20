// acme-backend/src/audit/audit.service.ts
//
// `GET /audit` — WP-22 (fase-3-pelaporan-publikasi.md §2.1, §2.2, §4).
// `select` EKSPLISIT (bukan `select *` lalu buang field) — `oldData`/
// `newData` TAK PERNAH diminta ke Postgres sama sekali, bukan cuma dibuang
// di DTO. Pertahanan berlapis untuk kebocoran `password_hash` (§2.2).
import { Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { QueryAuditDto } from './dto/query-audit.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 200;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryAuditDto,
  ): Promise<PaginatedResponse<AuditLogResponseDto>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = Math.min(query.perPage ?? DEFAULT_PER_PAGE, MAX_PER_PAGE);
    const where = { tableName: query.tableName, userId: query.userId };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          userEmail: true,
          userRole: true,
          action: true,
          tableName: true,
          recordId: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(rows, { page, perPage, total });
  }
}
