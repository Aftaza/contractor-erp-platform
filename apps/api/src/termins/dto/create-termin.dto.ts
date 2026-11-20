// acme-backend/src/termins/dto/create-termin.dto.ts
//
// Input `POST /projects/:id/termins` — master §4.5, fase-2 §4 WP-17.
// `projectId` datang dari param URL (bukan body); `createdBy` dari
// `req.user.id` — keduanya SENGAJA tak ada di sini.
import { TerminType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import {
  DateInRange,
  LongText,
  Rupiah,
  ShortText,
} from '../../common/validation/validation.decorators';

export class CreateTerminDto {
  @ShortText()
  name!: string;

  @IsEnum(TerminType)
  type!: TerminType;

  /** Rupiah. `bigint` di DB, jauh di bawah Number.MAX_SAFE_INTEGER untuk nilai termin realistis. */
  @Rupiah()
  amount!: number;

  @IsOptional()
  @DateInRange()
  dueDate?: string;

  @IsOptional()
  @LongText()
  notes?: string;
}
