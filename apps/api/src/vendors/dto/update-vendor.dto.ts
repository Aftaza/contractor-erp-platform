// acme-backend/src/vendors/dto/update-vendor.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateVendorDto } from './create-vendor.dto';

/** Semua field `CreateVendorDto`, opsional — pola sama `UpdateProjectDto`. */
export class UpdateVendorDto extends PartialType(CreateVendorDto) {}
