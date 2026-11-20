// acme-backend/src/common/dto/pagination-query.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Query paginasi bersama (SEC-3): `page` ≥ 1, `perPage` 1–100. DTO list meng-extend ini. */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page harus bilangan bulat' })
  @Min(1, { message: 'page minimal 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'perPage harus bilangan bulat' })
  @Min(1, { message: 'perPage minimal 1' })
  @Max(100, { message: 'perPage maksimal 100' })
  perPage?: number;
}
