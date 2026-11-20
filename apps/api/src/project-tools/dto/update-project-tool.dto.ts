// acme-backend/src/project-tools/dto/update-project-tool.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProjectToolDto } from './create-project-tool.dto';

/**
 * Semua field `CreateProjectToolDto`, opsional — `PATCH /project-tools/:id`.
 * Sama seperti create, `approvalStatus`/`recordedBy`/`approvedBy` tak ada di
 * sini: itu satu-satunya urusan `PATCH /project-tools/:id/approve`.
 */
export class UpdateProjectToolDto extends PartialType(CreateProjectToolDto) {}
