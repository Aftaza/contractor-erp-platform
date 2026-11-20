// acme-backend/src/projects/dto/create-project.dto.ts
import { ContractType, ProjectStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  DateInRange,
  DateNotBefore,
  LongText,
  Percent,
  Rupiah,
  ShortText,
} from '../../common/validation/validation.decorators';

/**
 * Input pembuatan proyek — master §4.2. Field internal SENGAJA tak ada di
 * sini: `progress` dihitung trigger DB (fase-1 §2.5), `rab_status`/
 * `rab_approved_*` dikelola WP-14 (approve), publikasi (`is_published` +
 * `public_*`) lewat endpoint terpisah `PATCH /:id/publication` (fase-1 §4
 * WP-13) — pemisahan kolom publik/internal itu disengaja, bukan lupa.
 */
export class CreateProjectDto {
  @ShortText()
  name!: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ShortText()
  location!: string;

  @IsEnum(ContractType)
  contractType!: ContractType;

  @IsEnum(ProjectStatus)
  status!: ProjectStatus;

  /** Nilai kontrak (rupiah). `bigint` di DB, tapi jauh di bawah
   *  Number.MAX_SAFE_INTEGER untuk nilai proyek realistis — `number` cukup. */
  @IsOptional()
  @Rupiah()
  contractValue?: number;

  @DateInRange()
  startDate!: string;

  @IsOptional()
  @DateInRange()
  @DateNotBefore('startDate')
  endDate?: string;

  @IsOptional()
  @LongText()
  description?: string;

  @IsOptional()
  @IsBoolean()
  ppnEnabled?: boolean;

  @IsOptional()
  @Percent()
  ppnRate?: number;
}
