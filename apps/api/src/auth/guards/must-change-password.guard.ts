// acme-backend/src/auth/guards/must-change-password.guard.ts
//
// Menolak akses selama user.mustChangePassword true (master §5.2, DoD WP-03).
// Diasumsikan JwtAuthGuard sudah jalan lebih dulu dan menempel `request.user`
// (lihat VerifiedUser di auth-verifier.service.ts).
//
// Belum terpasang sebagai guard global — itu tugas WP-04 saat menyusun rantai
// guard app-wide. Dalam AuthModule sendiri guard ini SENGAJA TAK dipasang di
// /auth/change-password maupun /auth/logout (keduanya harus tetap bisa
// diakses justru untuk keluar dari status ini).
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { VerifiedUser } from '../auth-verifier.service';

interface RequestWithVerifiedUser {
  user?: VerifiedUser;
}

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithVerifiedUser>();

    if (request.user?.mustChangePassword) {
      throw new ForbiddenException(
        'Password wajib diganti sebelum melanjutkan',
      );
    }
    return true;
  }
}
