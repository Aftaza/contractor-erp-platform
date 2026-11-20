// acme-backend/src/termins/dto/update-termin.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTerminDto } from './create-termin.dto';

/** Semua field `CreateTerminDto`, opsional — pola sama `UpdateProjectDto`. */
export class UpdateTerminDto extends PartialType(CreateTerminDto) {}
