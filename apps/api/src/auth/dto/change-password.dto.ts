// acme-backend/src/auth/dto/change-password.dto.ts
import { IsString, MinLength } from 'class-validator';
import { NotCommonPassword } from '../password-policy';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Password lama wajib diisi' })
  oldPassword!: string;

  // Kebijakan password (master §10) — konsisten dengan validasi di
  // prisma/seed.ts (minimal 12 karakter untuk akun seed). `NotCommonPassword`
  // ditambahkan WP-53 (fase-4 §2.9): panjang saja tak menahan "password1234".
  @IsString()
  @MinLength(12, { message: 'Password baru minimal 12 karakter' })
  @NotCommonPassword()
  newPassword!: string;
}
