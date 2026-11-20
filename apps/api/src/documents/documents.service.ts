// Dokumen privat — SRS §3.9 FR-DOC-1..8, SEC-12.
//
// Alur unggah: multer menulis tiap berkas (stream, bukan buffer) ke
// `uploads/private/.tmp/<acak>` → di sini dibaca ulang sekali untuk magic byte
// + sha256 → dipindah (rename, satu filesystem) ke `uploads/private/<id>`
// → metadata ditulis. Sisa berkas sementara dihapus interceptor controller,
// apa pun hasilnya. Path di disk tak pernah berasal dari input pengguna.
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { DocumentCategory, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { auditContextStorage } from '../audit/audit-context';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  MAGIC_HEAD_BYTES,
  sanitizeFileName,
  sniffDocumentMime,
} from './document-file.util';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const EXPIRING_DAYS = 60; // FR-DOC-8

/** Direktori berkas privat — saudara `uploads/public` di volume yang sama; Caddy menolak `/uploads/private/*` (deploy/common.caddy). */
export function privateUploadsDir(): string {
  return join(
    process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'),
    'private',
  );
}
/** Tujuan multer: di dalam `private/` supaya rename tetap satu filesystem. */
export function privateTempDir(): string {
  return join(privateUploadsDir(), '.tmp');
}

const FILE_SELECT = {
  id: true,
  originalName: true,
  mime: true,
  size: true,
  sha256: true,
  createdAt: true,
} satisfies Prisma.DocumentFileSelect;

const DOCUMENT_SELECT = {
  id: true,
  title: true,
  category: true,
  projectId: true,
  notes: true,
  validUntil: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
  files: {
    where: { deletedAt: null },
    select: FILE_SELECT,
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.DocumentSelect;

export type DocumentView = Prisma.DocumentGetPayload<{
  select: typeof DOCUMENT_SELECT;
}>;

interface InspectedFile {
  id: string;
  tempPath: string;
  originalName: string;
  mime: string;
  size: number;
  sha256: string;
}

/**
 * Validasi rujukan bukti privat (FR-FIN-2): dokumen aktif, kategori `bukti`,
 * dan milik proyek yang sama (atau tanpa proyek). Dipakai pengeluaran;
 * pembayaran termin & nota pembelian memakai aturan yang sama.
 */
export async function assertReceiptDocument(
  prisma: PrismaService,
  documentId: string,
  projectId: string,
): Promise<void> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    select: { category: true, projectId: true },
  });
  if (
    !doc ||
    doc.category !== DocumentCategory.bukti ||
    (doc.projectId !== null && doc.projectId !== projectId)
  ) {
    throw new BadRequestException(
      'receiptDocumentId harus dokumen kategori bukti milik proyek yang sama',
    );
  }
}

@Injectable()
export class DocumentsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // Sisa unggahan yang terputus saat proses mati — aman dihapus saat boot (satu instance API).
    rmSync(privateTempDir(), { recursive: true, force: true });
    mkdirSync(privateTempDir(), { recursive: true });
  }

  async findAll(
    query: QueryDocumentsDto,
  ): Promise<PaginatedResponse<DocumentView>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;
    const where: Prisma.DocumentWhereInput = {
      deletedAt: null,
      category: query.category,
      projectId: query.projectId,
    };
    if (query.expiring) {
      const limit = new Date();
      limit.setUTCDate(limit.getUTCDate() + EXPIRING_DAYS);
      where.category = DocumentCategory.legalitas;
      where.validUntil = { lte: limit };
    }

    const [rows, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        select: DOCUMENT_SELECT,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: query.expiring
          ? [{ validUntil: 'asc' }, { createdAt: 'desc' }]
          : { createdAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);
    return paginate(rows, { page, perPage, total });
  }

  async findOne(id: string): Promise<DocumentView> {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: DOCUMENT_SELECT,
    });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
    return doc;
  }

  async create(
    dto: CreateDocumentDto,
    files: Express.Multer.File[] | undefined,
    userId: string,
  ): Promise<DocumentView> {
    assertValidUntil(dto.category, dto.validUntil);
    if (dto.projectId) await this.assertActiveProject(dto.projectId);
    const inspected = await this.inspectAll(files);

    return this.storeFiles(inspected, () =>
      this.prisma.document.create({
        data: {
          title: dto.title,
          category: dto.category,
          projectId: dto.projectId,
          notes: dto.notes,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          uploadedBy: userId,
          files: { create: inspected.map(toFileRow) },
        },
        select: DOCUMENT_SELECT,
      }),
    );
  }

  async addFiles(
    id: string,
    files: Express.Multer.File[] | undefined,
  ): Promise<DocumentView> {
    await this.findOne(id);
    const inspected = await this.inspectAll(files);
    await this.storeFiles(inspected, () =>
      this.prisma.documentFile.createMany({
        data: inspected.map((f) => ({ ...toFileRow(f), documentId: id })),
      }),
    );
    return this.findOne(id);
  }

  async update(id: string, dto: UpdateDocumentDto): Promise<DocumentView> {
    const current = await this.findOne(id);
    assertValidUntil(
      dto.category ?? current.category,
      dto.validUntil === undefined ? current.validUntil : dto.validUntil,
    );
    if (dto.projectId) await this.assertActiveProject(dto.projectId);

    return this.prisma.document.update({
      where: { id },
      data: {
        title: dto.title,
        category: dto.category,
        projectId: dto.projectId,
        notes: dto.notes,
        validUntil:
          typeof dto.validUntil === 'string'
            ? new Date(dto.validUntil)
            : dto.validUntil,
      },
      select: DOCUMENT_SELECT,
    });
  }

  /**
   * Soft delete (FR-DOC-5) — UPDATE lewat extension audit, jadi trigger
   * mencatat pelaku. shortcut: berkas fisik belum dibersihkan otomatis setelah
   * 30 hari; tambahkan job purge bersama BCK-7 (W4) sebelum go-live.
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
  }

  async restore(id: string): Promise<DocumentView> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      select: { deletedAt: true, project: { select: { deletedAt: true } } },
    });
    if (!doc?.deletedAt) {
      throw new NotFoundException('Dokumen tidak ada di Tempat Sampah');
    }
    if (doc.project?.deletedAt) {
      throw new ConflictException(
        'Proyek dokumen ini masih terhapus — pulihkan proyeknya lebih dulu',
      );
    }
    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
      select: DOCUMENT_SELECT,
    });
  }

  /** FR-DOC-3/4: catat unduhan (trigger tak menangkap baca), lalu stream dari disk. */
  async download(
    id: string,
    fileId: string,
    userId: string,
  ): Promise<{ file: StreamableFile; name: string; mime: string }> {
    const meta = await this.prisma.documentFile.findFirst({
      where: {
        id: fileId,
        documentId: id,
        deletedAt: null,
        document: { deletedAt: null },
      },
      select: { originalName: true, mime: true, size: true },
    });
    // fileId sudah lolos ParseUUIDPipe dan berasal dari DB — bukan path kiriman klien.
    const path = join(privateUploadsDir(), fileId);
    if (!meta || !existsSync(path)) {
      throw new NotFoundException('Berkas tidak ditemukan');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        userEmail: user?.email,
        userRole: user?.role,
        action: 'DOWNLOAD',
        tableName: 'document_files',
        recordId: fileId,
        newData: { documentId: id, originalName: meta.originalName },
        ipAddress: auditContextStorage.getStore()?.clientIp || null,
      },
    });

    return {
      file: new StreamableFile(createReadStream(path), {
        length: Number(meta.size),
      }),
      name: meta.originalName,
      mime: meta.mime,
    };
  }

  private async assertActiveProject(projectId: string): Promise<void> {
    const found = await this.prisma.project.count({
      where: { id: projectId, deletedAt: null },
    });
    if (!found) throw new BadRequestException('projectId tidak ditemukan');
  }

  /** Semua berkas divalidasi sebelum satu pun dipindah — satu gagal, seluruh request 400. */
  private async inspectAll(
    files: Express.Multer.File[] | undefined,
  ): Promise<InspectedFile[]> {
    if (!files?.length) {
      throw new BadRequestException(
        'Minimal satu berkas wajib diunggah (field "files")',
      );
    }
    const out: InspectedFile[] = [];
    for (const f of files) {
      const originalName = sanitizeFileName(f.originalname);
      if (f.size === 0) {
        throw new BadRequestException(`Berkas kosong: ${originalName}`);
      }
      const { head, sha256 } = await readHeadAndHash(f.path);
      const mime = sniffDocumentMime(head, originalName);
      if (!mime) {
        throw new BadRequestException(
          `Tipe berkas tidak didukung: ${originalName}. Diizinkan: PDF, JPEG, PNG, WebP, DOCX, XLSX, ZIP`,
        );
      }
      out.push({
        id: randomUUID(),
        tempPath: f.path,
        originalName,
        mime,
        size: f.size,
        sha256,
      });
    }
    return out;
  }

  /** Pindah ke lokasi akhir lalu tulis metadata; gagal tulis → berkas akhir dihapus (tak ada yatim). */
  private async storeFiles<T>(
    files: InspectedFile[],
    write: () => Promise<T>,
  ): Promise<T> {
    const finals = files.map((f) => join(privateUploadsDir(), f.id));
    try {
      for (const [i, f] of files.entries()) await rename(f.tempPath, finals[i]);
      return await write();
    } catch (err) {
      await Promise.all(finals.map((p) => rm(p, { force: true })));
      throw err;
    }
  }
}

function toFileRow(f: InspectedFile) {
  return {
    id: f.id,
    originalName: f.originalName,
    mime: f.mime,
    size: BigInt(f.size),
    sha256: f.sha256,
  };
}

function assertValidUntil(
  category: DocumentCategory,
  validUntil: string | Date | null | undefined,
): void {
  if (validUntil != null && category !== DocumentCategory.legalitas) {
    throw new BadRequestException('validUntil hanya untuk kategori legalitas');
  }
}

/** Satu kali baca stream: 12 byte kepala + sha256 — memori tetap per chunk, bukan per berkas. */
async function readHeadAndHash(
  path: string,
): Promise<{ head: Buffer; sha256: string }> {
  const hash = createHash('sha256');
  let head = Buffer.alloc(0);
  for await (const chunk of createReadStream(path)) {
    const buf = chunk as Buffer;
    if (head.length < MAGIC_HEAD_BYTES) {
      head = Buffer.concat([
        head,
        buf.subarray(0, MAGIC_HEAD_BYTES - head.length),
      ]);
    }
    hash.update(buf);
  }
  return { head, sha256: hash.digest('hex') };
}
