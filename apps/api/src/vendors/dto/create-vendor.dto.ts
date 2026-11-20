// acme-backend/src/vendors/dto/create-vendor.dto.ts
import { IsOptional } from 'class-validator';
import {
  LongText,
  NormalizedEmail,
  PhoneId,
  ShortText,
} from '../../common/validation/validation.decorators';

/**
 * Input pembuatan vendor — master §4.7, fase-2 §4 WP-12. `createdBy` SENGAJA
 * tak ada di sini: diisi service dari `req.user.id`, tak pernah dari body.
 */
export class CreateVendorDto {
  @ShortText()
  name!: string;

  @IsOptional()
  @ShortText()
  category?: string;

  @IsOptional()
  @ShortText()
  contactName?: string;

  @IsOptional()
  @PhoneId()
  phone?: string;

  @IsOptional()
  @NormalizedEmail()
  email?: string;

  @IsOptional()
  @LongText()
  address?: string;

  @IsOptional()
  @LongText()
  notes?: string;
}
