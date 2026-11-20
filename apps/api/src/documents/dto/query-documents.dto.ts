import { DocumentCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** Query `GET /documents` — filter kategori/proyek (FR-DOC-6), `expiring` (FR-DOC-8). */
export class QueryDocumentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DocumentCategory, {
    message: 'category bukan kategori dokumen yang valid',
  })
  category?: DocumentCategory;

  @IsOptional()
  @IsUUID('all', { message: 'projectId harus UUID' })
  projectId?: string;

  /** `true` = legalitas yang kedaluwarsa ≤ 60 hari lagi (termasuk yang sudah lewat), urut `validUntil` naik. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'expiring harus true atau false' })
  expiring?: boolean;
}
