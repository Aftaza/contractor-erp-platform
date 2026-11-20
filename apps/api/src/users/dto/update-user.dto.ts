// acme-backend/src/users/dto/update-user.dto.ts
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';
import {
  NormalizedEmail,
  ShortText,
} from '../../common/validation/validation.decorators';

/**
 * `PATCH /users/:id` — data non-password (fase-2 §4 WP-10). Password punya
 * endpoint terpisah (`PATCH /users/:id/password`, lihat SetUserPasswordDto)
 * supaya alur "set password baru → mustChangePassword=true" tak bercampur
 * dengan update field biasa.
 */
export class UpdateUserDto {
  @IsOptional()
  @NormalizedEmail()
  email?: string;

  @IsOptional()
  @ShortText()
  fullName?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role tidak valid' })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
