// acme-backend/src/auth/dto/login.dto.ts
import { IsString, MinLength } from 'class-validator';
import { NormalizedEmail } from '../../common/validation/validation.decorators';

export class LoginDto {
  @NormalizedEmail()
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Password wajib diisi' })
  password!: string;
}
