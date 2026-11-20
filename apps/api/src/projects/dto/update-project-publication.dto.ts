// acme-backend/src/projects/dto/update-project-publication.dto.ts
import { PublicCategory } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  LongText,
  ShortText,
} from '../../common/validation/validation.decorators';

/**
 * Input `PATCH /projects/:id/publication` — HANYA `is_published` + kolom
 * `public_*` (master §4.2). Sengaja DTO terpisah dari `UpdateProjectDto`:
 * mencegah data internal (nilai kontrak, rab_status, dst.) ikut lewat jalur
 * yang nantinya memberi data ke situs publik (fase-1 §4 WP-13).
 */
export class UpdateProjectPublicationDto {
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @ShortText()
  publicTitle?: string;

  @IsOptional()
  @LongText()
  publicSummary?: string;

  @IsOptional()
  @IsEnum(PublicCategory)
  publicCategory?: PublicCategory;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'publicImages maksimal 10 gambar' })
  @IsString({ each: true })
  @MaxLength(500, {
    each: true,
    message: 'setiap publicImages maksimal 500 karakter',
  })
  publicImages?: string[];
}
