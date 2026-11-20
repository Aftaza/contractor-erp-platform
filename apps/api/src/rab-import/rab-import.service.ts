// acme-backend/src/rab-import/rab-import.service.ts
//
// `rab-import` — WP-15 (fase-1-vertikal-rab.md §4). Parse xlsx (SheetJS,
// `rab-import.util.ts`) → validasi (nomor baris) → tulis pohon lewat
// `RabService.create()` yang SUDAH ADA (WP-14) — dipakai apa adanya lewat DI
// biasa (RabImportModule mendeklarasikan `RabService` sebagai provider
// miliknya sendiri, TANPA menyunting `rab.module.ts` yang beku), supaya
// aturan bentuk pohon (`assertValidNodeShape`, parent harus grup, dst.) tak
// diduplikasi/didrift di sini.
//
// Urutan wajib (master §5.5, DoD WP-15): tulis HANYA saat `rab_status='draft'`
// — 198 node saat draft = 260ms, node sama saat approved = 6.987ms (27×
// lebih lambat, tiap insert memicu recompute penuh). Approve tetap endpoint
// terpisah milik WP-14 (`POST /projects/:id/rab/approve`), TAK diulang di sini.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodeType, RabStatus } from '@prisma/client';
import { AppRole } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RabService } from '../rab/rab.service';
import { RabImportResultDto } from './dto/rab-import-result.dto';
import { parseRabImportSheet } from './rab-import.util';

@Injectable()
export class RabImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabService: RabService,
  ) {}

  async import(
    projectId: string,
    file: Express.Multer.File | undefined,
    role: AppRole,
  ): Promise<RabImportResultDto> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File xlsx wajib diunggah (field "file")');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan');

    // Master §5.5 — menulis saat approved bukan sekadar lambat, salah desain
    // (27× lebih lambat karena tiap insert memicu recompute penuh). Ditolak
    // di sini SEBELUM parse/tulis apa pun, terlepas dari role pemanggil
    // (pimpinan pun tetap ditolak — beda dari `assertCanMutate` yang
    // mengizinkan pimpinan mengubah RAB approved satu-per-satu).
    if (project.rabStatus === RabStatus.approved) {
      throw new BadRequestException(
        'Impor ditolak — RAB proyek ini sudah rab_status=approved. Impor xlsx hanya boleh saat draft (master §5.5); approve sekali di akhir lewat POST /projects/:id/rab/approve',
      );
    }

    const rows = parseRabImportSheet(file.buffer);

    const createdIds: string[] = [];
    const counts: Record<NodeType, number> = {
      section: 0,
      subgroup: 0,
      phase: 0,
      item: 0,
    };

    // Sekuensial, BUKAN `$transaction([array])` — RabNode model teraudit,
    // bentuk array $transaction menggantung senyap (fase-0 pelajaran #1,
    // fase-1 §4 WP-15 "jebakan"). Baris file selalu mendahulukan induk
    // sebelum anak (parser membangun index via stack top-down), jadi
    // `createdIds[row.parentIndex]` selalu sudah terisi di sini.
    for (const row of rows) {
      const parentId =
        row.parentIndex === null ? undefined : createdIds[row.parentIndex];
      const node = await this.rabService.create(
        projectId,
        {
          parentId,
          nodeType: row.nodeType,
          name: row.name,
          sortOrder: row.sortOrder,
          volume: row.volume,
          unit: row.unit,
          materialPrice: row.materialPrice,
          laborPrice: row.laborPrice,
        },
        role,
      );
      createdIds.push(node.id);
      counts[row.nodeType]++;
    }

    return {
      projectId,
      totalNodes: rows.length,
      sectionCount: counts.section,
      subgroupCount: counts.subgroup,
      phaseCount: counts.phase,
      itemCount: counts.item,
    };
  }
}
