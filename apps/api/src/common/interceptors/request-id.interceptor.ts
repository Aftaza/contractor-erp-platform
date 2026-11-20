// acme-backend/src/common/interceptors/request-id.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

type RequestWithId = Request & { requestId?: string };

/**
 * Menempelkan request id ke request masuk (`request.requestId`) dan header
 * respons (`X-Request-Id`). Dipasang sebagai APP_INTERCEPTOR global (WP-01).
 *
 * Catatan: request yang ditolak guard (mis. JwtAuthGuard) tak melewati
 * interceptor sama sekali — HttpExceptionFilter punya fallback pembuatan
 * requestId sendiri untuk kasus itu, supaya kontrak §3.1 tetap terpenuhi
 * untuk SEMUA error, bukan hanya yang lolos sampai controller.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<Response>();

    const requestId = request.requestId ?? randomUUID();
    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }
}
