// acme-backend/src/users/dto/set-user-password.dto.ts
import { IsString, MinLength } from 'class-validator';
import { NotCommonPassword } from '../../auth/password-policy';

/**
 * `PATCH /users/:id/password` (fase-2 §4 WP-10). Pimpinan men-set password
 * user lain langsung — TANPA `oldPassword` (beda dari
 * `auth/dto/change-password.dto.ts`, yang untuk user mengganti passwordnya
 * SENDIRI). Selalu men-set `mustChangePassword: true` di service.
 */
export class SetUserPasswordDto {
  @IsString()
  @MinLength(12, { message: 'Password minimal 12 karakter' })
  @NotCommonPassword()
  newPassword!: string;
}
