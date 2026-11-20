// acme-backend/src/auth/password-policy.ts
//
// Fase 4 WP-53 (fase-4-deploy-verifikasi.md §2.9) — master §10 menuntut
// "panjang minimum, tolak password umum". Panjang sudah ditegakkan
// `@MinLength(12)` di tiga DTO; file ini menutup sisanya.
//
// TANPA `zxcvbn` (§2.9, keputusan fase): kamus ratusan KB untuk mencegah
// "password123" bukan biaya yang sebanding. Fungsi murni, tanpa DI — karena
// itu ia boleh dipakai lintas modul (`auth` dan `users`) lewat impor
// relatif, mengikuti preseden fase-3 §2.3. `src/common/**` beku, jadi tak
// bisa jadi rumahnya.
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

/**
 * Password yang paling sering muncul di kebocoran kredensial, ditambah
 * varian spesifik organisasi ini. Semua huruf kecil — pembanding
 * menormalkan input lebih dulu. Panjang < 12 tak perlu dimasukkan;
 * `@MinLength(12)` sudah menolaknya lebih dulu.
 */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '123456789012',
  '1234567890123',
  'password1234',
  'password12345',
  'passwordpassword',
  'qwertyuiop12',
  'qwerty123456',
  'qwertyuiop123',
  'administrator',
  'admin1234567',
  'adminadmin12',
  'letmein12345',
  'welcome12345',
  'iloveyou1234',
  'monkey123456',
  'dragon123456',
  'sunshine1234',
  'princess1234',
  'football1234',
  'baseball1234',
  'superman1234',
  'trustno1no12',
  'abc123456789',
  'aaaaaaaaaaaa',
  'zzzzzzzzzzzz',
  '111111111111',
  '000000000000',
  '123123123123',
  'asdfghjkl123',
  'zxcvbnm12345',
  'p@ssw0rd1234',
  'p@ssword1234',
  'katasandi123',
  'rahasia12345',
  'indonesia123',
  'jakarta12345',
  'surabaya1234',
  'acmekonstruksi1',
  'acmekonstruksi',
]);

/**
 * `true` bila password terlalu mudah ditebak.
 *
 * Tiga aturan, sengaja sedikit:
 *  1. cocok persis dengan daftar password terlantas (case-insensitive);
 *  2. memuat "acme" — nama perusahaan adalah tebakan pertama penyerang;
 *  3. memuat bagian lokal email pemilik akun (≥3 karakter).
 *
 * ponytail: pencocokan persis, bukan penilaian entropi. Ceiling yang
 * disadari — "Password1234!" lolos. Kalau suatu saat butuh penilaian
 * kekuatan sungguhan, itu `zxcvbn` dan keputusan tersendiri, bukan
 * menumbuhkan daftar ini sampai seribu baris.
 */
export function isCommonPassword(password: string, email?: string): boolean {
  const normalized = password.trim().toLowerCase();

  if (COMMON_PASSWORDS.has(normalized)) return true;
  if (normalized.includes('acme')) return true;

  const localPart = email?.split('@')[0]?.trim().toLowerCase();
  if (localPart && localPart.length >= 3 && normalized.includes(localPart)) {
    return true;
  }

  return false;
}

@ValidatorConstraint({ name: 'notCommonPassword', async: false })
class NotCommonPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return true; // @IsString yang mengurusnya

    // `email` diambil dari objek DTO yang sama kalau ada (CreateUserDto).
    // DTO ganti-password tak memuat email, jadi aturan 3 tak berlaku di sana
    // — dan itu benar: di sana email pemilik akun tak dikirim klien.
    const email = (args.object as { email?: unknown }).email;
    return !isCommonPassword(
      value,
      typeof email === 'string' ? email : undefined,
    );
  }

  defaultMessage(): string {
    return 'Password terlalu mudah ditebak. Jangan pakai password umum, nama perusahaan, atau bagian dari alamat email.';
  }
}

/** Dekorator DTO — dipasang berdampingan dengan `@MinLength(12)`. */
export function NotCommonPassword(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: NotCommonPasswordConstraint,
    });
  };
}
