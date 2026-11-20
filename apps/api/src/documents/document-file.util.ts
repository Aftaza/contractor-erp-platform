// Fungsi murni modul dokumen privat (SRS §3.9 FR-DOC-1, SEC-12).
import { extname } from 'node:path';
import { matchesMagicBytes } from '../uploads/upload-filename.util';

/** Maks 50 MB per file (FR-DOC-1). */
export const MAX_DOCUMENT_FILE_BYTES = 50 * 1024 * 1024;
/** shortcut: maks 10 file per request (SRS tak menyebut batas per request), naikkan bila ada kebutuhan unggah massal. */
export const MAX_FILES_PER_REQUEST = 10;
/** Byte kepala yang cukup untuk semua tanda tangan di bawah. */
export const MAGIC_HEAD_BYTES = 12;

const ZIP_FAMILY: Readonly<Record<string, string>> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
};
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Mime dari ISI berkas (magic byte), bukan dari ekstensi/Content-Type klien.
 * `undefined` = di luar allowlist FR-DOC-1 (PDF, JPEG/PNG/WebP, DOCX, XLSX, ZIP).
 */
export function sniffDocumentMime(
  head: Buffer,
  originalName: string,
): string | undefined {
  if (head.subarray(0, 5).toString('latin1') === '%PDF-') {
    return 'application/pdf';
  }
  const image = IMAGE_MIMES.find((m) => matchesMagicBytes(head, m));
  if (image) return image;
  if (head.subarray(0, 4).equals(ZIP_SIGNATURE)) {
    // shortcut: DOCX/XLSX/ZIP berbagi tanda tangan ZIP; jenisnya diambil dari ekstensi nama asli tanpa membuka arsip — aman karena unduhan selalu attachment + nosniff; periksa isi arsip bila mime dipakai untuk pratinjau.
    const ext = extname(originalName).slice(1).toLowerCase();
    return ZIP_FAMILY[ext] ?? ZIP_FAMILY.zip;
  }
  return undefined;
}

// eslint-disable-next-line no-control-regex
const UNSAFE_NAME_CHARS = /[\u0000-\u001f\u007f"]/g;

/**
 * Nama asli hanya untuk metadata & `Content-Disposition` — tak pernah jadi
 * path (berkas disimpan sebagai `<uuid>`). Buang direktori, karakter kontrol
 * dan kutip; kosong/`.`/`..` → "berkas".
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? '';
  const clean = base.replace(UNSAFE_NAME_CHARS, '').trim().slice(0, 200);
  return clean === '' || clean === '.' || clean === '..' ? 'berkas' : clean;
}
