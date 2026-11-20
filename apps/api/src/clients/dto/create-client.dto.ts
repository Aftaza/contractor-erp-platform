// acme-backend/src/clients/dto/create-client.dto.ts
import { IsOptional } from 'class-validator';
import {
  LongText,
  NormalizedEmail,
  PhoneId,
  ShortText,
} from '../../common/validation/validation.decorators';

/**
 * Input pembuatan klien — master §4.7, fase-2 §4 WP-11. `createdBy` SENGAJA
 * tak ada di sini: diisi service dari `req.user.id`, tak pernah dari body.
 */
export class CreateClientDto {
  @ShortText()
  name!: string;

  @IsOptional()
  @ShortText()
  sector?: string;

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
