// acme-backend/src/uploads/upload-filename.util.ts
//
// Fungsi murni — WP-21 (fase-3-pelaporan-publikasi.md §2.7). Nama file
// UNGGAHAN DI-GENERATE ULANG: `<uuid v4>.<ext>`, `ext` diturunkan dari mime
// yang lolos whitelist, TAK PERNAH dari nama asli kiriman klien. Ini yang
// mencegah nama berbahaya (`evil.php.jpg`, `../../.env`) ikut tersimpan.
import { randomUUID } from 'node:crypto';

/** Whitelist mime (§2.7) — satu-satunya sumber pemetaan mime -> ekstensi. */
export const UPLOAD_MIME_EXT: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Pola nama hasil generate — dipakai juga untuk memvalidasi `GET /uploads/:filename` (§2.7). */
export const UPLOAD_FILENAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Ekstensi kanonik untuk mime, atau `undefined` bila mime di luar whitelist. */
export function extensionForMime(mimetype: string): string | undefined {
  return UPLOAD_MIME_EXT[mimetype];
}

/**
 * Nama file baru untuk mime yang SUDAH lolos whitelist. Pemanggil wajib
 * memvalidasi mime lebih dulu (lihat `uploads.service.ts`) — fungsi ini
 * murni generate nama, tak menolak mime apa pun sendiri.
 */
export function generateUploadFilename(mimetype: string): string {
  const ext = extensionForMime(mimetype);
  if (!ext) {
    throw new Error(
      `generateUploadFilename dipanggil dengan mime di luar whitelist: ${mimetype}`,
    );
  }
  return `${randomUUID()}.${ext}`;
}

/** Content-Type untuk ekstensi hasil generate — dipakai `GET /uploads/:filename`. */
export function mimeForExtension(ext: string): string | undefined {
  const entry = Object.entries(UPLOAD_MIME_EXT).find(([, e]) => e === ext);
  return entry?.[0];
}

// Tanda tangan magic byte (fase-4-deploy-verifikasi.md §2.8) — 12 byte
// pertama cukup untuk tiga mime yang diizinkan. Tanpa dependensi `file-type`
// (§2.8: keputusan fase, jangan dibuka lagi).
const MAGIC_BYTES: Readonly<Record<string, readonly number[]>> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

/**
 * Isi berkas cocok dengan mime yang DIKLAIM klien (§2.8) — bukan sekadar
 * "salah satu dari tiga tanda tangan yang diizinkan". Klaim `image/png`
 * atas byte JPEG tetap ditolak. `image/webp` diperiksa terpisah: RIFF
 * (wadah generik) di byte 0-3 DAN WEBP (penanda isi) di byte 8-11 — RIFF
 * saja tak cukup karena RIFF juga dipakai format lain (AVI, WAV).
 */
export function matchesMagicBytes(buffer: Buffer, mimetype: string): boolean {
  if (mimetype === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  const signature = MAGIC_BYTES[mimetype];
  if (!signature) return false;
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}
