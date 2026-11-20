// acme-backend/src/config/env.validation.ts
import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export type NodeEnvValue = 'development' | 'production' | 'test';

/**
 * Skema env wajib (WP-01, master §5.1). Divalidasi SEKALI saat boot
 * (main.ts memanggil `validateEnv` sebelum `NestFactory.create`) — env yang
 * kurang/invalid membuat proses gagal start, bukan meledak di request pertama.
 */
export class EnvironmentVariables {
  @IsString()
  @Matches(/^postgresql:\/\/.+/, {
    message: 'DATABASE_URL harus diawali "postgresql://"',
  })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_ACCESS_SECRET minimal 16 karakter' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_REFRESH_SECRET minimal 16 karakter' })
  JWT_REFRESH_SECRET!: string;

  @IsIn(['development', 'production', 'test'], {
    message: 'NODE_ENV harus salah satu dari: development, production, test',
  })
  NODE_ENV!: NodeEnvValue;

  @Type(() => Number)
  @IsInt({ message: 'PORT harus angka' })
  @Min(1)
  @Max(65535)
  PORT!: number;
}

/**
 * Validasi `process.env` (atau objek serupa) terhadap {@link EnvironmentVariables}.
 * Melempar `Error` dengan pesan yang menyebut field mana yang salah — dipakai
 * langsung di main.ts (fail-fast) dan sebagai opsi `validate` untuk
 * `ConfigModule.forRoot` (lihat config.module.ts).
 */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const details = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join('; ');
    throw new Error(`Konfigurasi environment tidak valid: ${details}`);
  }

  return validated;
}
