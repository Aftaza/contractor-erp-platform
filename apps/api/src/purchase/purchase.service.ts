import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodeType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { MAX_RUPIAH } from '../common/validation/validation.decorators';
import { ApiWarningDto, assertAcknowledged } from '../common/warnings';
import { assertReceiptDocument } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertActiveProject, softDelete } from '../trash/soft-delete';
import {
  CreatePurchaseNoteDto,
  PurchaseLineInputDto,
} from './dto/create-purchase-note.dto';
import { UpdatePurchaseNoteDto } from './dto/update-purchase-note.dto';
import {
  lineSubtotal,
  purchaseLimitWarnings,
  purchaseTotalsByNode,
} from './purchase-totals';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

const NOTE_INCLUDE = {
  vendor: { select: { id: true, name: true } },
  lines: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { rabNode: { select: { name: true, unit: true } } },
  },
} satisfies Prisma.PurchaseNoteInclude;

type NoteWithLines = Prisma.PurchaseNoteGetPayload<{
  include: typeof NOTE_INCLUDE;
}>;

export type PurchaseNoteResponse = NoteWithLines & { total: bigint };

function toResponse(note: NoteWithLines): PurchaseNoteResponse {
  return {
    ...note,
    total: note.lines.reduce((sum, l) => sum + (l.subtotal ?? 0n), 0n),
  };
}

/**
 * Nota pembelian + baris (SRS FR-FIN-3). Banyak item & satu vendor per nota;
 * satu item boleh di banyak nota/vendor. Subtotal dan validasi "node item
 * proyek yang sama" ditegakkan trigger DB; service memberi pesan jelas dan
 * peringatan pola A (FR-NTF-7) sebelum menyimpan.
 */
@Injectable()
export class PurchaseService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    projectId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<PurchaseNoteResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;
    const where = { projectId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.purchaseNote.findMany({
        where,
        include: NOTE_INCLUDE,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: [{ noteDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.purchaseNote.count({ where }),
    ]);
    return paginate(rows.map(toResponse), { page, perPage, total });
  }

  async findOne(id: string): Promise<PurchaseNoteResponse> {
    const note = await this.prisma.purchaseNote.findFirst({
      where: { id, deletedAt: null },
      include: NOTE_INCLUDE,
    });
    if (!note) throw new NotFoundException('Nota pembelian tidak ditemukan');
    return toResponse(note);
  }

  async create(
    projectId: string,
    dto: CreatePurchaseNoteDto,
    userId: string,
  ): Promise<PurchaseNoteResponse> {
    await assertActiveProject(this.prisma, projectId);
    await this.assertActiveVendor(dto.vendorId);
    if (dto.receiptDocumentId) {
      await assertReceiptDocument(
        this.prisma,
        dto.receiptDocumentId,
        projectId,
      );
    }

    assertAcknowledged(
      await this.warningsFor(projectId, dto.lines, null),
      dto.acknowledgeWarnings,
    );

    const note = await this.prisma.purchaseNote
      .create({
        data: {
          projectId,
          vendorId: dto.vendorId,
          noteNumber: dto.noteNumber,
          noteDate: new Date(dto.noteDate),
          receiptDocumentId: dto.receiptDocumentId,
          notes: dto.notes,
          recordedBy: userId,
          lines: { create: dto.lines.map(lineData) },
        },
        include: NOTE_INCLUDE,
      })
      .catch(rethrowKnownError);
    return toResponse(note);
  }

  /**
   * `lines` bila dikirim = daftar baris lengkap, di-diff per `id`: ber-`id` =
   * ubah di tempat (hanya bila berubah), tanpa `id` = baris baru, baris aktif
   * yang tak dikirim = soft delete. ID stabil & audit hanya mencatat perubahan.
   */
  async update(
    id: string,
    dto: UpdatePurchaseNoteDto,
    userId: string,
  ): Promise<PurchaseNoteResponse> {
    const note = await this.findActiveOrThrow(id);
    await this.assertActiveVendor(dto.vendorId);
    if (dto.receiptDocumentId) {
      await assertReceiptDocument(
        this.prisma,
        dto.receiptDocumentId,
        note.projectId,
      );
    }
    const lines = dto.lines ?? undefined;
    let linesWrite:
      Prisma.PurchaseLineUpdateManyWithoutPurchaseNoteNestedInput | undefined;
    if (lines) {
      const current = new Map(note.lines.map((l) => [l.id, l]));
      const ids = lines.flatMap((l) => (l.id ? [l.id] : []));
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('lines.id tidak boleh duplikat');
      }
      const unknown = lines.find((l) => l.id && !current.has(l.id));
      if (unknown) {
        throw new BadRequestException(
          `lines.id ${unknown.id} bukan baris aktif nota ini`,
        );
      }
      assertAcknowledged(
        await this.warningsFor(note.projectId, lines, id),
        dto.acknowledgeWarnings,
      );

      // ID baris baru dibuat di sini supaya `updateMany` tak ikut menghapusnya, apa pun urutan nested write Prisma.
      const created = lines
        .filter((l) => !l.id)
        .map((l) => ({ id: randomUUID(), ...lineData(l) }));
      const changed = lines.filter((l) => {
        const old = l.id ? current.get(l.id) : undefined;
        return (
          old &&
          (old.rabNodeId !== l.rabNodeId ||
            !old.quantity.equals(l.quantity) ||
            old.unitPrice !== BigInt(l.unitPrice) ||
            (old.notes ?? null) !== (l.notes ?? null))
        );
      });
      const keep = [
        ...lines.flatMap((l) => (l.id ? [l.id] : [])),
        ...created.map((l) => l.id),
      ];
      const now = new Date();
      linesWrite = {
        updateMany: {
          where: { deletedAt: null, id: { notIn: keep } },
          data: { deletedAt: now, deletedBy: userId },
        },
        update: changed.map((l) => ({
          // deletedAt: null → baris yang terhapus di sela baca & tulis gagal (P2025 → 400), bukan dihidupkan diam-diam.
          where: { id: l.id, deletedAt: null },
          data: { ...lineData(l), notes: l.notes ?? null },
        })),
        create: created,
      };
    }

    const updated = await this.prisma.purchaseNote
      .update({
        where: { id },
        data: {
          vendorId: dto.vendorId,
          noteNumber: dto.noteNumber,
          noteDate: dto.noteDate ? new Date(dto.noteDate) : undefined,
          receiptDocumentId: dto.receiptDocumentId,
          notes: dto.notes,
          lines: linesWrite,
        },
        include: NOTE_INCLUDE,
      })
      .catch((err: unknown) => {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          throw new BadRequestException(
            'Baris nota berubah atau terhapus saat menyimpan — muat ulang nota',
          );
        }
        return rethrowKnownError(err);
      });
    return toResponse(updated);
  }

  /** Soft delete nota + barisnya, satu penanda (FR-DEL-1/3); pimpinan saja lewat @Roles. Pulihkan: `POST /purchases/:id/restore`. */
  async remove(id: string, userId: string): Promise<void> {
    await this.findActiveOrThrow(id);
    await softDelete(this.prisma, 'purchase_note', id, userId);
  }

  /**
   * Pola A FR-FIN-3: Σ jumlah > volume, atau Σ nominal > material_price ×
   * volume — atas baris aktif proyek (tanpa nota yang sedang diedit) + baris
   * yang dikirim. Sekaligus menolak 400 node yang bukan item aktif proyek ini
   * (trigger DB tetap jaring kedua).
   */
  private async warningsFor(
    projectId: string,
    lines: PurchaseLineInputDto[],
    excludeNoteId: string | null,
  ): Promise<ApiWarningDto[]> {
    if (lines.some((l) => lineSubtotal(l.quantity, l.unitPrice) > MAX_RUPIAH)) {
      throw new BadRequestException(
        'subtotal baris (quantity × unitPrice) maksimal 1.000.000.000.000.000',
      );
    }
    const ids = [...new Set(lines.map((l) => l.rabNodeId))];
    const [nodes, totals] = await Promise.all([
      this.prisma.rabNode.findMany({
        where: {
          id: { in: ids },
          projectId,
          nodeType: NodeType.item,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          unit: true,
          volume: true,
          materialPrice: true,
        },
      }),
      purchaseTotalsByNode(this.prisma, projectId, excludeNoteId),
    ]);
    if (nodes.length !== ids.length) {
      throw new BadRequestException(
        'rabNodeId harus item RAB aktif dari proyek nota ini',
      );
    }

    const warnings: ApiWarningDto[] = [];
    for (const node of nodes) {
      const mine = lines.filter((l) => l.rabNodeId === node.id);
      const prev = totals.get(node.id);
      const qty = mine.reduce(
        (s, l) => s.add(l.quantity),
        prev?.qty ?? new Prisma.Decimal(0),
      );
      const amount = mine.reduce(
        (s, l) => s + lineSubtotal(l.quantity, l.unitPrice),
        prev?.amount ?? 0n,
      );
      warnings.push(...purchaseLimitWarnings(node, qty, amount));
    }
    return warnings;
  }

  /** Vendor terhapus tak boleh dipilih (FR-DEL-4); FK tetap jaring kedua. */
  private async assertActiveVendor(vendorId?: string | null): Promise<void> {
    if (
      vendorId &&
      !(await this.prisma.vendor.count({
        where: { id: vendorId, deletedAt: null },
      }))
    ) {
      throw new BadRequestException('vendorId tidak ditemukan');
    }
  }

  private async findActiveOrThrow(id: string) {
    const note = await this.prisma.purchaseNote.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        projectId: true,
        lines: {
          where: { deletedAt: null },
          select: {
            id: true,
            rabNodeId: true,
            quantity: true,
            unitPrice: true,
            notes: true,
          },
        },
      },
    });
    if (!note) throw new NotFoundException('Nota pembelian tidak ditemukan');
    return note;
  }
}

function lineData(l: PurchaseLineInputDto) {
  return {
    rabNodeId: l.rabNodeId,
    quantity: new Prisma.Decimal(l.quantity),
    unitPrice: BigInt(l.unitPrice),
    notes: l.notes,
  };
}

/** `vendor_id` tak dikenal → FK P2003 → 400 (pola sama `expenses.service.ts`). */
function rethrowKnownError(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2003'
  ) {
    throw new BadRequestException('vendorId tidak ditemukan');
  }
  throw err;
}
