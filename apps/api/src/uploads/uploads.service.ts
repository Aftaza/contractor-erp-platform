// acme-backend/src/uploads/uploads.service.ts
//
// `uploads` — WP-21 (fase-3-pelaporan-publikasi.md §2.7). Disk lokal, tanpa
// `ServeStaticModule` (harus didaftar app.module.ts, beku). Direktori:
// `process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads')` — TANPA
// menambah `src/config/env.validation.ts` (beku), dibuat saat modul init.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  UPLOAD_FILENAME_PATTERN,
  extensionForMime,
  generateUploadFilename,
  matchesMagicBytes,
  mimeForExtension,
} from './upload-filename.util';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly uploadsDir =
    process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

  onModuleInit(): void {
    mkdirSync(this.uploadsDir, { recursive: true });
  }

  async save(file: Express.Multer.File | undefined): Promise<{ path: string }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File wajib diunggah (field "file")');
    }
    if (!extensionForMime(file.mimetype)) {
      throw new BadRequestException(
        `Tipe file tidak didukung: ${file.mimetype}. Whitelist: image/jpeg, image/png, image/webp`,
      );
    }
    // Sniffing magic byte (fase-4-deploy-verifikasi.md §2.8, utang J) — isi
    // berkas wajib cocok dengan Content-Type yang diklaim klien, bukan
    // sekadar salah satu dari tiga tanda tangan yang diizinkan.
    if (!matchesMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        `Isi berkas tidak cocok dengan tipe yang diklaim: ${file.mimetype}`,
      );
    }

    const filename = generateUploadFilename(file.mimetype);
    await writeFile(join(this.uploadsDir, filename), file.buffer);

    return { path: `/uploads/${filename}` };
  }

  /**
   * Nama divalidasi terhadap pola generate SEBELUM `join()` — ini yang
   * mencegah `../../.env` (§2.7). Nama di luar pola atau file yang tak ada ->
   * 404, BUKAN 400 (jangan bocorkan struktur direktori).
   */
  read(filename: string): StreamableFile {
    if (!UPLOAD_FILENAME_PATTERN.test(filename)) {
      throw new NotFoundException();
    }

    const filePath = join(this.uploadsDir, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException();
    }

    const ext = filename.slice(filename.lastIndexOf('.') + 1);
    return new StreamableFile(createReadStream(filePath), {
      type: mimeForExtension(ext) ?? 'application/octet-stream',
    });
  }
}
