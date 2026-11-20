// acme-backend/src/common/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { STATUS_CODES } from 'http';
import type { Request, Response } from 'express';
import { AppLogger } from '../logger/app-logger.service';
import { ApiWarningDto, WarningsException } from '../warnings';

/** Bentuk error seragam — master plan §3.1. Semua error dari api, tanpa kecuali. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  requestId: string;
  /** Hanya pada 422 `Warnings` (pola A, FR-NTF-7). */
  warnings?: ApiWarningDto[];
}

type RequestWithId = Request & { requestId?: string };

/**
 * Filter error global. Stack trace tak pernah muncul di response — error tak
 * terduga (bukan HttpException) selalu dibalas pesan generik 500, terlepas
 * dari environment. `requestId` selalu ada, walau ditolak sebelum
 * RequestIdInterceptor sempat jalan (mis. oleh guard) — lihat fallback di bawah.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    // Fallback: request yang ditolak guard sebelum interceptor sempat jalan
    // belum punya requestId — buat baru supaya kontrak §3.1 tetap terpenuhi.
    const requestId = request?.requestId ?? randomUUID();

    const { statusCode, error, message } = this.normalize(exception);

    this.logger.error(`${statusCode} ${error} - ${message}`, {
      requestId,
      path: request?.url,
      method: request?.method,
    });

    const body: ApiErrorBody =
      exception instanceof WarningsException
        ? {
            statusCode,
            error: 'Warnings',
            message,
            requestId,
            warnings: exception.warnings,
          }
        : { statusCode, error, message, requestId };
    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    error: string;
    message: string;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const message = this.extractMessage(
        exception.getResponse(),
        exception.message,
      );
      return {
        statusCode,
        error: STATUS_CODES[statusCode] ?? 'Error',
        message,
      };
    }

    const prisma = this.mapPrismaError(exception);
    if (prisma) return prisma;

    // Error tak terduga — tak pernah bocorkan detail internal/stack trace ke klien.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error:
        STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR] ??
        'Internal Server Error',
      message: 'Terjadi kesalahan pada server',
    };
  }

  /** SEC-8: error Prisma yang dikenal → status seragam, pesan Indonesia tanpa detail internal. */
  private mapPrismaError(
    exception: unknown,
  ): { statusCode: number; error: string; message: string } | undefined {
    if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) return;
    const meta = exception.meta ?? {};
    const conflict = (message: string) => ({
      statusCode: HttpStatus.CONFLICT,
      error: STATUS_CODES[HttpStatus.CONFLICT] ?? 'Conflict',
      message,
    });

    if (exception.code === 'P2025') {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        error: STATUS_CODES[HttpStatus.NOT_FOUND] ?? 'Not Found',
        message: 'Data tidak ditemukan',
      };
    }
    if (exception.code === 'P2002') {
      // Array = nama field; string = nama indeks internal (mis. indeks unik
      // parsial `tools_code_active_key`) — tak disebut ke klien.
      const target = meta.target;
      return conflict(
        Array.isArray(target) && target.length > 0
          ? `Data dengan ${target.join(', ')} yang sama sudah ada`
          : 'Data yang sama sudah ada',
      );
    }
    // P2003 = FK dilanggar lewat query Prisma; P2010 + 23503 = lewat raw SQL.
    if (
      exception.code === 'P2003' ||
      (exception.code === 'P2010' && meta.code === '23503')
    ) {
      return conflict('Data masih dipakai oleh data lain');
    }
    return;
  }

  private extractMessage(res: unknown, fallback: string): string {
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object' && 'message' in res) {
      const m = res.message;
      if (Array.isArray(m)) return m.join(', '); // pesan validasi class-validator
      if (typeof m === 'string') return m;
    }
    return fallback;
  }
}
