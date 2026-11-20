// acme-backend/src/users/dto/create-user.dto.ts
import { IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { NotCommonPassword } from '../../auth/password-policy';
import {
  NormalizedEmail,
  ShortText,
} from '../../common/validation/validation.decorators';

/**
 * Input pembuatan user — master §4.1 & §10, fase-2 §4 WP-10. `password`
 * di-hash service lewat `AuthService.hashPassword` (satu-satunya tempat
 * parameter argon2id ditetapkan) — TIDAK PERNAH disimpan/dikembalikan
 * mentah. User baru selalu lahir `mustChangePassword: true` (default skema).
 */
export class CreateUserDto {
  @NormalizedEmail()
  email!: string;

  // Kebijakan password sama dengan ChangePasswordDto (master §10).
  // `NotCommonPassword` (WP-53, fase-4 §2.9) juga menolak password yang
  // memuat bagian lokal `email` di atas — pimpinan yang membuatkan akun
  // cenderung memakai nama user sebagai password sementara.
  @IsString()
  @MinLength(12, { message: 'Password minimal 12 karakter' })
  @NotCommonPassword()
  password!: string;

  @ShortText()
  fullName!: string;

  @IsEnum(Role, { message: 'Role tidak valid' })
  role!: Role;
}
