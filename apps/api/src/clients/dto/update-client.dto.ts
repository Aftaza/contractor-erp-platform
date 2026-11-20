// acme-backend/src/clients/dto/update-client.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

/** Semua field `CreateClientDto`, opsional — pola sama `UpdateProjectDto`. */
export class UpdateClientDto extends PartialType(CreateClientDto) {}
