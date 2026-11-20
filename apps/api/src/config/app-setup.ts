// acme-backend/src/config/app-setup.ts
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { parseTrustedProxies } from '../audit/trusted-proxy';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { RequestIdInterceptor } from '../common/interceptors/request-id.interceptor';
import { AppLogger } from '../common/logger/app-logger.service';

/** Prefix global — master §5.1. `/health` sengaja dikecualikan (lihat configureApp). */
export const API_PREFIX = 'api/v1';

/**
 * Wiring aplikasi Nest (pipe, filter, interceptor, prefix, swagger) — dipakai
 * SAMA PERSIS oleh main.ts (boot sungguhan) dan test e2e
 * (test/bootstrap.e2e-spec.ts), supaya test benar-benar menguji konfigurasi
 * yang jalan di production, bukan salinan yang bisa drift.
 */
/**
 * `JSON.stringify` melempar "Do not know how to serialize a BigInt" — dan
 * skema kita penuh `bigint`: `contract_value`, `material_price`, `labor_price`,
 * `total`, `purchased_amount`, `amount`. Tanpa ini tiap modul menambal
 * sendiri-sendiri (WP-13 sudah, WP-14 & WP-16 akan menabrak hal yang sama) dan
 * satu yang terlewat = 500 di production, bukan bug yang kelihatan saat unit
 * test. Dipusatkan di sini, sekali, oleh integrator.
 *
 * `Number` dipilih ketimbang string supaya frontend tak perlu parsing: nilai
 * rupiah kontrak konstruksi jauh di bawah Number.MAX_SAFE_INTEGER (~9×10^15).
 * Kalau suatu saat angka sebesar itu muncul, ganti ke string DAN sesuaikan
 * `lib/types/api.ts` di web bersamaan.
 */
function enableBigIntJsonSerialization(): void {
  const proto = BigInt.prototype as unknown as { toJSON?: () => number };
  proto.toJSON ??= function (this: bigint) {
    return Number(this);
  };
}

/**
 * U2 (fase-1-vertikal-rab.md §5b): `Decimal` Prisma punya `toJSON()` bawaan
 * decimal.js yang mengembalikan STRING, sementara `bigint` di atas sudah jadi
 * number. Akibatnya satu objek response memuat dua bentuk angka:
 * `{ contractValue: 5000000, progress: "0", ppnRate: "11" }`. Bahayanya senyap
 * — `"10" < "9"` bernilai true, jadi pengurutan/perbandingan progress salah
 * tanpa pernah melempar error. Disatukan ke number di sini, sekali, supaya DTO
 * response & `lib/types/api.ts` di web bisa mendeklarasikan `number` jujur.
 *
 * Beda dengan BigInt di atas: `??=` TAK bisa dipakai — decimal.js sudah
 * mendefinisikan `toJSON` (mengembalikan string), jadi ini penimpaan sengaja.
 *
 * ponytail: presisi dibatasi double (±15 digit signifikan). Kolom Decimal di
 * skema hanya `progress` (0–100), `ppn_rate` (11), `volume`, dan
 * `progress_percent` — semuanya jauh di dalam batas itu. Kalau nanti muncul
 * Decimal bernilai uang presisi tinggi, kembalikan ke string DAN sesuaikan DTO
 * response + `lib/types/api.ts` bersamaan.
 */
function enableDecimalJsonSerialization(): void {
  const proto = Prisma.Decimal.prototype as unknown as { toJSON: () => number };
  proto.toJSON = function (this: Prisma.Decimal) {
    return this.toNumber();
  };
}

export function configureApp(app: INestApplication): void {
  enableBigIntJsonSerialization();
  enableDecimalJsonSerialization();
  app.useLogger(new AppLogger());

  // SEC-1: `req.ip` hanya mengikuti X-Forwarded-For dari proxy internal yang
  // sama dengan yang dipercaya resolveClientIp (kosong = tak percaya siapa pun).
  const trustedProxies = parseTrustedProxies(
    process.env.AUDIT_TRUSTED_PROXY_IPS,
  );
  (app as NestExpressApplication).set('trust proxy', trustedProxies);
  if (process.env.NODE_ENV === 'production' && trustedProxies.length === 0) {
    new Logger('TrustProxy').warn(
      'AUDIT_TRUSTED_PROXY_IPS kosong: semua klien tampak ber-IP proxy — throttle login berlaku sekantor dan IP audit salah',
    );
  }

  // `/health` dikecualikan dari prefix versi API supaya healthcheck Docker
  // punya path stabil, tak ikut berubah kalau versi API berganti.
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });

  // whitelist+forbidNonWhitelisted+transform — master §5.1. Field asing di
  // body request ditolak 400, bukan diam-diam diabaikan.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Dari common/** (WP-00) — pakai, jangan ubah.
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor());

  setupSwagger(app);
}

/**
 * Swagger/OpenAPI — hanya aktif non-production (master §5.1). Sumber
 * `lib/types/api.ts` di web dihasilkan lewat `scripts/generate-openapi.ts`
 * (application context, bukan lewat endpoint ini), tapi endpoint ini tetap
 * berguna untuk eksplorasi manual API selama development.
 */
export function setupSwagger(app: INestApplication): void {
  if (process.env.NODE_ENV === 'production') return;

  const config = new DocumentBuilder()
    .setTitle('Acme ERP API')
    .setDescription(
      'API internal acme-backend — konsumen: web ERP, mobile (nanti), situs publik.',
    )
    .setVersion('1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);
}
