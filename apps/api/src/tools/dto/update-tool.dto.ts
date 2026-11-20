// acme-backend/src/tools/dto/update-tool.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateToolDto } from './create-tool.dto';

/** Semua field `CreateToolDto`, opsional — pola sama seperti `UpdateProjectDto` (WP-13). */
export class UpdateToolDto extends PartialType(CreateToolDto) {}
