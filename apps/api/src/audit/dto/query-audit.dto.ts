// acme-backend/src/audit/dto/query-audit.dto.ts
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /audit` — fase-3-pelaporan-publikasi.md §4 WP-22. */
export class QueryAuditDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  tableName?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
