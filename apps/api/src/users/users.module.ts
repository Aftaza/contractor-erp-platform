// acme-backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Diisi WP-10 (fase-2-keuangan-operasional.md §4). Modul ini SUDAH
 * terdaftar di app.module.ts (dibekukan WP-00) — file ini TAK PERNAH
 * menyentuhnya (master §3.4). `AuthModule` diimpor eksplisit karena
 * `UsersService` butuh `AuthService.hashPassword` lewat DI — `AuthModule`
 * sudah meng-export `AuthService` (auth.module.ts:34).
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
