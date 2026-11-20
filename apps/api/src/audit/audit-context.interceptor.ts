// acme-backend/src/audit/audit-context.interceptor.ts
//
// Interceptor global (WP-05): mengisi AsyncLocalStorage (audit-context.ts)
// dari request HTTP sebelum handler/controller jalan, supaya Prisma
// extension (audit.extension.ts) bisa membacanya di mana pun mutasi
// dipicu di dalam rantai async request ini.
//
// Didaftarkan sebagai APP_INTERCEPTOR dari provider AuditModule sendiri
// (bukan app.module.ts — itu pola Nest resmi: modul mana pun boleh
// menyumbang APP_INTERCEPTOR/APP_GUARD global lewat provider-nya).
//
// Interceptor (bukan middleware) sengaja dipilih: guard (JwtAuthGuard,
// WP-04) jalan SEBELUM interceptor, jadi `request.user` sudah terisi saat
// `intercept()` ini jalan — middleware jalan lebih awal dari guard dan
// belum tentu punya `request.user`.
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { auditContextStorage } from './audit-context';
import {
  compileTrustedProxies,
  resolveClientIp,
  TrustProxyFn,
} from './trusted-proxy';

interface RequestWithUser extends Request {
  user?: { id: string; role: string };
}

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  private readonly trusted: TrustProxyFn;

  constructor(config: ConfigService) {
    this.trusted = compileTrustedProxies(
      config.get<string>('AUDIT_TRUSTED_PROXY_IPS'),
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    return new Observable((subscriber) => {
      auditContextStorage.run(
        {
          userId: request.user?.id,
          clientIp: resolveClientIp(request, this.trusted),
        },
        () => {
          next.handle().subscribe(subscriber);
        },
      );
    });
  }
}
