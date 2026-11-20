// acme-backend/src/tools/dto/update-tool-status.dto.ts
import { ToolStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** `PATCH /tools/:id/status` — sumbu terpisah dari `update()` (master §4.6). */
export class UpdateToolStatusDto {
  @IsEnum(ToolStatus)
  status!: ToolStatus;
}
