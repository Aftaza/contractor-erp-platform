// acme-backend/src/projects/dto/update-project.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/**
 * Semua field `CreateProjectDto`, opsional. `PartialType` dari
 * `@nestjs/swagger` (bukan dependency baru — sudah terpasang untuk OpenAPI,
 * lihat package.json) mempertahankan dekorator `class-validator` dari DTO
 * dasar sambil membuat tiap field opsional.
 */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
