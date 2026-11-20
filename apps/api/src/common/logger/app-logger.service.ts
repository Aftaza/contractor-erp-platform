// acme-backend/src/common/logger/app-logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';

/** Nama field yang tak boleh pernah muncul di log — dicocokkan case-insensitive. */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'newpassword',
  'oldpassword',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'tokenhash',
  'token_hash',
  'authorization',
  'cookie',
  'secret',
]);

/**
 * Redaksi rekursif field sensitif sebelum ditulis ke log. Dipakai AppLogger
 * dan HttpExceptionFilter — password/token tak pernah keluar ke log (master §10).
 */
export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));

  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : redact(val, seen);
    }
    return out;
  }

  return value;
}

/**
 * Logger terstruktur (satu baris JSON per entri) dengan redaksi otomatis.
 * Dipasang sebagai logger aplikasi via `app.useLogger(new AppLogger())` (WP-01).
 */
@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly context?: string) {}

  log(message: unknown, ...optionalParams: unknown[]) {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.write('verbose', message, optionalParams);
  }

  private write(level: string, message: unknown, optionalParams: unknown[]) {
    const entry = {
      level,
      message: redact(message),
      context: this.context,
      timestamp: new Date().toISOString(),
      ...(optionalParams.length
        ? {
            meta: redact(
              optionalParams.length === 1 ? optionalParams[0] : optionalParams,
            ),
          }
        : {}),
    };

    console.log(JSON.stringify(entry));
  }
}
