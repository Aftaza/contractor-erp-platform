// acme-backend/src/auth/auth.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import type { Request } from 'express';
import { compileTrustedProxies, resolveClientIp } from '../audit/trusted-proxy';
import { AUTH_VERIFIER } from '../common/guards/jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthVerifierService } from './auth-verifier.service';
import {
  LOGIN_THROTTLE_IP_LIMIT,
  LOGIN_THROTTLE_LIMIT,
  LOGIN_THROTTLE_TTL_MS,
} from './constants';

@Module({
  imports: [
    // Secret TAK di-set di sini — access & refresh token pakai secret
    // berbeda (JWT_ACCESS_SECRET / JWT_REFRESH_SECRET), dipilih per-panggilan
    // lewat opsi `secret` di signAsync/verifyAsync (lihat auth.service.ts,
    // auth-verifier.service.ts).
    JwtModule.register({}),
    // SEC-1: dua kuota — per IP+email (brute force satu akun) dan per IP
    // (menyemprot banyak email). IP dari `resolveClientIp` (CF-Connecting-IP
    // hanya dari proxy tepercaya), sumber yang sama dengan audit.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const trusted = compileTrustedProxies(
          config.get<string>('AUDIT_TRUSTED_PROXY_IPS'),
        );
        const ip = (req: Request) => resolveClientIp(req, trusted) ?? '';
        return {
          errorMessage: 'Terlalu banyak percobaan login. Coba lagi nanti.',
          throttlers: [
            {
              name: 'ip-email',
              ttl: LOGIN_THROTTLE_TTL_MS,
              limit: LOGIN_THROTTLE_LIMIT,
              // Guard jalan sebelum ValidationPipe — body masih mentah.
              getTracker: (req: Request) => {
                const email = (req.body as { email?: unknown } | undefined)
                  ?.email;
                const key = typeof email === 'string' ? email : '';
                return `${ip(req)}|${key.trim().toLowerCase()}`;
              },
            },
            {
              name: 'ip',
              ttl: LOGIN_THROTTLE_TTL_MS,
              limit: LOGIN_THROTTLE_IP_LIMIT,
              getTracker: ip,
            },
          ],
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthVerifierService,
    // Bind implementasi nyata ke token yang dibaca JwtAuthGuard
    // (common/guards, dibekukan WP-00) — lihat komentar AUTH_VERIFIER di sana.
    { provide: AUTH_VERIFIER, useExisting: AuthVerifierService },
  ],
  // AUTH_VERIFIER diekspor supaya modul lain (mis. PolicyModule/WP-04) yang
  // mendaftarkan JwtAuthGuard sebagai APP_GUARD global bisa meng-import
  // AuthModule dan mendapat provider ini lewat DI.
  exports: [AuthService, AUTH_VERIFIER],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // cookie-parser tak diwire di src/config/app-setup.ts (dibekukan WP-00) —
    // AuthModule perlu req.cookies utk jalur web (JwtAuthGuard membaca cookie
    // 'access_token'; controller di modul ini membaca 'refresh_token').
    // forRoutes('*') mendaftarkan middleware ke seluruh app tanpa menyentuh
    // main.ts/app-setup.ts (keduanya di luar kepemilikan WP-03).
    consumer.apply(cookieParser()).forRoutes('*');
  }
}
