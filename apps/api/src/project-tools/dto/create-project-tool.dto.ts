// acme-backend/src/project-tools/dto/create-project-tool.dto.ts
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  DateInRange,
  DateNotBefore,
  LongText,
} from '../../common/validation/validation.decorators';

/**
 * Input `POST /projects/:id/project-tools` — master §4.6, fase-2 §4 WP-18.
 * `approvalStatus`/`recordedBy`/`approvedBy`/`approvedAt` SENGAJA tak ada di
 * sini: baris selalu lahir `approvalStatus='pending'` dengan `recordedBy` =
 * `req.user.id`, diisi service — TAK BOLEH dioverride dari body.
 */
export class CreateProjectToolDto {
  @IsUUID()
  toolId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1e9)
  quantity?: number;

  @IsOptional()
  @DateInRange()
  usedFrom?: string;

  @IsOptional()
  @DateInRange()
  @DateNotBefore('usedFrom')
  usedTo?: string;

  @IsOptional()
  @LongText()
  notes?: string;
}
