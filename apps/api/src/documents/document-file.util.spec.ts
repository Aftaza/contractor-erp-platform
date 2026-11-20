import { sanitizeFileName, sniffDocumentMime } from './document-file.util';

const head = (...bytes: number[]) => Buffer.from(bytes);

describe('sniffDocumentMime', () => {
  it('mengenali PDF, gambar, dan keluarga ZIP dari magic byte', () => {
    expect(sniffDocumentMime(Buffer.from('%PDF-1.7\n'), 'a.bin')).toBe(
      'application/pdf',
    );
    expect(sniffDocumentMime(head(0xff, 0xd8, 0xff, 0xe0), 'x.pdf')).toBe(
      'image/jpeg',
    );
    expect(
      sniffDocumentMime(
        head(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
        'x',
      ),
    ).toBe('image/png');
    expect(sniffDocumentMime(Buffer.from('RIFF\0\0\0\0WEBP'), 'x')).toBe(
      'image/webp',
    );
    const zip = head(0x50, 0x4b, 0x03, 0x04, 0x14);
    expect(sniffDocumentMime(zip, 'Kontrak.DOCX')).toMatch(/wordprocessingml/);
    expect(sniffDocumentMime(zip, 'rab.xlsx')).toMatch(/spreadsheetml/);
    expect(sniffDocumentMime(zip, 'arsip.exe')).toBe('application/zip');
  });

  it('menolak isi di luar allowlist meski ekstensinya .pdf', () => {
    expect(sniffDocumentMime(Buffer.from('MZ\x90\0'), 'nota.pdf')).toBe(
      undefined,
    );
    expect(sniffDocumentMime(Buffer.from('<html>'), 'a.png')).toBe(undefined);
    expect(sniffDocumentMime(Buffer.alloc(0), 'a.pdf')).toBe(undefined);
  });
});

describe('sanitizeFileName', () => {
  it('membuang direktori, kontrol, dan kutip', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('..\\..\\win.ini')).toBe('win.ini');
    expect(sanitizeFileName('a"b\r\nc.pdf')).toBe('abc.pdf');
    expect(sanitizeFileName('..')).toBe('berkas');
    expect(sanitizeFileName('dir/')).toBe('berkas');
    expect(sanitizeFileName('Nota Toko Budi.pdf')).toBe('Nota Toko Budi.pdf');
  });
});
