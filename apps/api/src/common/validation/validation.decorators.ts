// Dekorator validasi bersama (SEC-6). Pesan Bahasa Indonesia, menyebut nama field.
import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
  ValidationArguments,
} from 'class-validator';

type Args = ValidationArguments;
const msg = (rest: string) => (a: Args) => `${a.property} ${rest}`;

/**
 * Trim; string kosong setelah trim = tidak diisi (undefined, field diabaikan). Non-string dibiarkan.
 * KONTRAK: untuk MENGOSONGKAN field opsional lewat PATCH, klien mengirim `null`, bukan "".
 */
const trimEmpty = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  });

const text = (max: number) =>
  applyDecorators(
    trimEmpty(),
    IsString({ message: msg('harus berupa teks') }),
    IsNotEmpty({ message: msg('wajib diisi') }), // dilewati oleh @IsOptional()
    MaxLength(max, { message: msg(`maksimal ${max} karakter`) }),
  );

/** Teks pendek (nama, judul, kode, nomor): 1–200 karakter. */
export const ShortText = () => text(200);
/** Teks panjang (deskripsi, catatan, alasan): maks 2.000 karakter. */
export const LongText = () => text(2000);

export const MAX_RUPIAH = 10 ** 15;

/** Rupiah bilangan bulat 1..10¹⁵ (`allowZero` untuk field yang boleh nol, mis. harga upah). */
export const Rupiah = (opts: { allowZero?: boolean } = {}) => {
  const min = opts.allowZero ? 0 : 1;
  return applyDecorators(
    IsInt({ message: msg('harus bilangan bulat (rupiah)') }),
    Min(min, { message: msg(`minimal ${min}`) }),
    // < MAX_SAFE_INTEGER, jadi number JSON tak kehilangan presisi.
    Max(MAX_RUPIAH, { message: msg('maksimal 1.000.000.000.000.000') }),
  );
};

/** Volume/jumlah: > 0, maks 4 desimal, ≤ 10⁹. */
export const Volume = () =>
  applyDecorators(
    IsNumber(
      { maxDecimalPlaces: 4 },
      { message: msg('harus angka dengan maksimal 4 desimal') },
    ),
    IsPositive({ message: msg('harus lebih dari 0') }),
    Max(1e9, { message: msg('maksimal 1.000.000.000') }),
  );

/** Persen 0–100, maks 2 desimal. */
export const Percent = () =>
  applyDecorators(
    IsNumber(
      { maxDecimalPlaces: 2 },
      { message: msg('harus angka dengan maksimal 2 desimal') },
    ),
    Min(0, { message: msg('minimal 0') }),
    Max(100, { message: msg('maksimal 100') }),
  );

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDateInRange(v: unknown): boolean {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    return false; // mis. 2026-02-31
  }
  const max = new Date();
  max.setUTCFullYear(max.getUTCFullYear() + 5);
  return v >= '2000-01-01' && v <= max.toISOString().slice(0, 10);
}

/** Tanggal `YYYY-MM-DD`, 1 Jan 2000 s.d. hari ini + 5 tahun. */
export const DateInRange = () =>
  ValidateBy({
    name: 'dateInRange',
    validator: {
      validate: isDateInRange,
      defaultMessage: msg(
        'harus tanggal YYYY-MM-DD antara 1 Jan 2000 dan 5 tahun dari sekarang',
      ),
    },
  });

/**
 * Antar-field: tanggal ini ≥ `other`. Dilewati bila salah satunya kosong.
 * shortcut: pada PATCH parsial hanya membandingkan field yang dikirim bersama, bukan nilai tersimpan; upgrade bila perlu cek di service.
 */
export const DateNotBefore = (other: string) =>
  ValidateBy({
    name: 'dateNotBefore',
    constraints: [other],
    validator: {
      validate: (v: unknown, a?: Args) => {
        const o = (a?.object as Record<string, unknown>)[other];
        return typeof v !== 'string' || typeof o !== 'string' || v >= o;
      },
      defaultMessage: (a?: Args) =>
        `${a?.property} tidak boleh sebelum ${String(a?.constraints[0])}`,
    },
  });

/** Email: trim + lowercase sebelum divalidasi/disimpan. */
export const NormalizedEmail = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
    IsEmail({}, { message: msg('bukan email yang valid') }),
  );

/** Telepon Indonesia (`08…`, `62…`, `+62…`) dinormalkan ke `+62…`; 9–15 digit termasuk kode negara. */
export const PhoneId = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => {
      if (typeof value !== 'string') return value;
      const s = value.replace(/[\s\-.()]/g, '');
      if (s === '') return undefined;
      if (s.startsWith('+62')) return s;
      if (s.startsWith('62')) return `+${s}`;
      if (s.startsWith('0')) return `+62${s.slice(1)}`;
      return s;
    }),
    Matches(/^\+62[1-9]\d{6,12}$/, {
      message: msg('harus nomor telepon Indonesia (08… atau +62…, 9–15 digit)'),
    }),
  );
