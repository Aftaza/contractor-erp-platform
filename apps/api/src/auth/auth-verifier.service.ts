// acme-backend/src/auth/auth-verifier.service.ts
//
// Implementasi nyata AuthVerifier (kontrak di src/common/guards/jwt-auth.guard.ts,
// dibekukan WP-00) — di-bind ke token AUTH_VERIFIER dari AuthModule (lihat
// auth.module.ts). JwtAuthGuard fail-closed tanpa provider ini terpasang.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthenticatedUser,
  AuthVerifier,
} from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Payload access token (lihat issueTokenPair di auth.service.ts). */
interface AccessTokenPayload {
  sub: string;
}

/**
 * User terverifikasi + `mustChangePassword`. AuthenticatedUser (frozen di
 * common/guards) hanya mendeklarasikan {id, role} — field tambahan ini tetap
 * menempel di `request.user` saat runtime (structural typing TS mengizinkan
 * properti ekstra lewat variabel yang sudah diketik lebar). WP-04 perlu
 * membaca field ini utk enforcement must_change_password lintas endpoint;
 * lihat catatan kontrak di laporan akhir WP-03.
 */
export interface VerifiedUser extends AuthenticatedUser {
  mustChangePassword: boolean;
}

@Injectable()
export class AuthVerifierService implements AuthVerifier {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async verify(token: string): Promise<AuthenticatedUser | null> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      return null;
    }

    // is_active DICEK ULANG KE DB TIAP REQUEST (bukan hanya dari klaim JWT) —
    // akun yang dinonaktifkan langsung menolak token lama yang masih valid
    // secara kriptografis (master §9.3, DoD WP-03). Biaya: satu SELECT
    // by-primary-key per request terautentikasi.
    // ponytail: tanpa cache — kalau ini jadi bottleneck nyata, tambahkan
    // cache pendek (mis. 5-10 detik) di depan lookup ini, bukan sebelum ada
    // bukti perlu.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) return null;

    const verified: VerifiedUser = {
      id: user.id,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
    return verified;
  }
}
