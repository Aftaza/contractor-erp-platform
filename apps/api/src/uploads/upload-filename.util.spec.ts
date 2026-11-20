// acme-backend/src/uploads/upload-filename.util.spec.ts
//
// Unit murni (tanpa DB, tanpa Nest) — WP-21, DoD §4 butir 5
// (fase-3-pelaporan-publikasi.md §2.7): nama file unggahan DI-GENERATE
// ULANG dari mime yang lolos whitelist, dan nama asli kiriman klien TAK
// PERNAH ikut. Ini yang membuat `evil.php.jpg` dan `../../.env` mustahil
// tersimpan sebagai nama file di disk.
import {
  UPLOAD_FILENAME_PATTERN,
  extensionForMime,
  generateUploadFilename,
  matchesMagicBytes,
  mimeForExtension,
} from './upload-filename.util';

describe('upload-filename.util (WP-21)', () => {
  it('mime yang lolos whitelist -> ekstensi kanonik', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/png')).toBe('png');
    expect(extensionForMime('image/webp')).toBe('webp');
  });

  it('mime di luar whitelist -> undefined (bukan tebakan ekstensi)', () => {
    expect(extensionForMime('application/pdf')).toBeUndefined();
    expect(extensionForMime('image/svg+xml')).toBeUndefined();
    expect(extensionForMime('text/html')).toBeUndefined();
  });

  it('nama hasil generate cocok pola dan ekstensinya dari MIME, bukan dari nama asli', () => {
    const name = generateUploadFilename('image/png');
    expect(name).toMatch(UPLOAD_FILENAME_PATTERN);
    expect(name.endsWith('.png')).toBe(true);
  });

  it('nama asli klien (`evil.php.jpg`) TAK PERNAH muncul di nama hasil', () => {
    // Fungsi ini memang tak menerima nama asli sama sekali — itulah desainnya.
    // Test ini mengunci sifat tsb: hasilnya hanya <uuid>.<ext>, nol jejak
    // string dari klien, dan dua panggilan tak pernah bertabrakan.
    const a = generateUploadFilename('image/jpeg');
    const b = generateUploadFilename('image/jpeg');

    for (const name of [a, b]) {
      expect(name).toMatch(UPLOAD_FILENAME_PATTERN);
      expect(name).not.toContain('evil');
      expect(name).not.toContain('php');
      expect(name).not.toContain('/');
      expect(name).not.toContain('..');
    }
    expect(a).not.toBe(b);
  });

  it('generate dengan mime di luar whitelist melempar — bukan diam-diam menyimpan', () => {
    expect(() => generateUploadFilename('application/pdf')).toThrow(
      /whitelist/i,
    );
  });

  it('pola nama menolak path traversal & nama liar', () => {
    expect(UPLOAD_FILENAME_PATTERN.test('../../.env')).toBe(false);
    expect(UPLOAD_FILENAME_PATTERN.test('../secrets.png')).toBe(false);
    expect(UPLOAD_FILENAME_PATTERN.test('a/b.png')).toBe(false);
    expect(UPLOAD_FILENAME_PATTERN.test('evil.php.jpg')).toBe(false);
    expect(UPLOAD_FILENAME_PATTERN.test('shell.jpg.php')).toBe(false);
    expect(UPLOAD_FILENAME_PATTERN.test('.env')).toBe(false);
  });

  it('mimeForExtension membalikkan pemetaan untuk Content-Type response', () => {
    expect(mimeForExtension('jpg')).toBe('image/jpeg');
    expect(mimeForExtension('webp')).toBe('image/webp');
    expect(mimeForExtension('exe')).toBeUndefined();
  });
});

describe('matchesMagicBytes (WP-53, §2.8) — isi berkas vs mime yang diklaim', () => {
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const PNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
  ]);
  const WEBP = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP', 'ascii'),
  ]);
  const EXE = Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary');

  it('byte cocok dengan mime yang diklaim -> true', () => {
    expect(matchesMagicBytes(JPEG, 'image/jpeg')).toBe(true);
    expect(matchesMagicBytes(PNG, 'image/png')).toBe(true);
    expect(matchesMagicBytes(WEBP, 'image/webp')).toBe(true);
  });

  it('exe (MZ) mengklaim image/png -> ditolak', () => {
    expect(matchesMagicBytes(EXE, 'image/png')).toBe(false);
  });

  it('byte JPEG mengklaim image/png -> ditolak (bukan sekadar "salah satu dari tiga")', () => {
    expect(matchesMagicBytes(JPEG, 'image/png')).toBe(false);
  });

  it('byte PNG mengklaim image/jpeg -> ditolak', () => {
    expect(matchesMagicBytes(PNG, 'image/jpeg')).toBe(false);
  });

  it('RIFF tanpa penanda WEBP di byte 8-11 -> ditolak (mis. wadah AVI/WAV)', () => {
    const riffNonWebp = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from('AVI ', 'ascii'),
    ]);
    expect(matchesMagicBytes(riffNonWebp, 'image/webp')).toBe(false);
  });

  it('buffer lebih pendek dari tanda tangan -> ditolak, bukan meledak', () => {
    expect(matchesMagicBytes(Buffer.from([0xff, 0xd8]), 'image/jpeg')).toBe(
      false,
    );
    expect(matchesMagicBytes(Buffer.alloc(0), 'image/png')).toBe(false);
  });

  it('mime di luar whitelist -> ditolak', () => {
    expect(matchesMagicBytes(PNG, 'application/pdf')).toBe(false);
  });
});
