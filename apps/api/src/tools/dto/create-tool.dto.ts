// acme-backend/src/tools/dto/create-tool.dto.ts
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  LongText,
  ShortText,
} from '../../common/validation/validation.decorators';

/**
 * Input pembuatan alat — master §4.6. `status` SENGAJA tak ada di sini:
 * DB default `tersedia`, dan perubahan status lewat endpoint terpisah
 * (`PATCH /tools/:id/status`, WP-18 fase-2 §4).
 */
export class CreateToolDto {
  @IsOptional()
  @ShortText()
  code?: string;

  @ShortText()
  name!: string;

  @IsOptional()
  @ShortText()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1e9)
  quantity?: number;

  @IsOptional()
  @ShortText()
  condition?: string;

  @IsOptional()
  @LongText()
  notes?: string;
}
