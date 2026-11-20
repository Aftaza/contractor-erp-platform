// acme-backend/src/common/guards/jwt-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Token DI untuk verifier auth sebenarnya. WP-03/WP-04 mem-bind implementasi
 * nyata (verifikasi JWT + cek `is_active` ke DB) ke token ini dari modul
 * mereka sendiri (`AuthModule`/`PolicyModule`) — file guard ini TAK PERNAH
 * disentuh paket lain (master §3.4, §11.1).
 */
export const AUTH_VERIFIER = Symbol('AUTH_VERIFIER');

export interface AuthenticatedUser {
  id: string;
  role: string;
}

export interface AuthVerifier {
  /** Kembalikan user terautentikasi, atau null bila token tak valid/kedaluwarsa. */
  verify(token: string): Promise<AuthenticatedUser | null>;
}

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  user?: AuthenticatedUser;
}

/**
 * Kerangka guard auth global (JwtAuthGuard). Ini MITIGASI UTAMA hilangnya RLS
 * (master §12) — karena itu guard ini fail-closed: tanpa AUTH_VERIFIER
 * terpasang, request non-publik SELALU ditolak, tak pernah diam-diam lolos.
 *
 * Belum didaftarkan sebagai APP_GUARD global — itu tugas WP-04, dari modul
 * miliknya sendiri (bukan dari app.module.ts atau file ini).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(AUTH_VERIFIER) private readonly verifier?: AuthVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestLike>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Token tidak ditemukan');

    if (!this.verifier) {
      // Fail-closed: sebelum WP-03/WP-04 mem-bind verifier, tak ada request
      // terautentikasi yang lolos.
      throw new UnauthorizedException('Auth belum dikonfigurasi');
    }

    const user = await this.verifier.verify(token);
    if (!user) throw new UnauthorizedException('Token tidak valid');

    request.user = user;
    return true;
  }

  private extractToken(request: RequestLike): string | undefined {
    const authHeader = request.headers['authorization'];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (headerValue?.startsWith('Bearer ')) return headerValue.slice(7);
    return request.cookies?.['access_token'];
  }
}
