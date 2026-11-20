import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { QueryTrashDto } from './dto/query-trash.dto';
import { TrashItemDto } from './dto/trash-item-response.dto';
import { TrashType, restoreDeleted } from './soft-delete';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * Hanya "akar" penghapusan: baris yang induknya masih aktif. Turunan yang
 * ikut terhapus kaskade disembunyikan — pulih bersama induknya, dan
 * memulihkannya sendiri pasti ditolak (induk terhapus).
 */
const TRASH_ROWS = Prisma.sql`
  SELECT 'project' AS type, x.id, x.name, par.id AS project_id, par.name AS project_name, x.deleted_at, x.deleted_by
  FROM projects x LEFT JOIN projects par ON par.id = x.parent_id
  WHERE x.deleted_at IS NOT NULL AND par.deleted_at IS NULL
  UNION ALL
  SELECT 'rab_node', x.id, x.name, p.id, p.name, x.deleted_at, x.deleted_by
  FROM rab_nodes x JOIN projects p ON p.id = x.project_id LEFT JOIN rab_nodes par ON par.id = x.parent_id
  WHERE x.deleted_at IS NOT NULL AND p.deleted_at IS NULL AND par.deleted_at IS NULL
  UNION ALL
  SELECT 'termin', x.id, x.name, p.id, p.name, x.deleted_at, x.deleted_by
  FROM termins x JOIN projects p ON p.id = x.project_id
  WHERE x.deleted_at IS NOT NULL AND p.deleted_at IS NULL
  UNION ALL
  SELECT 'termin_payment', x.id, 'Pembayaran ' || t.name || ' ' || to_char(x.payment_date, 'YYYY-MM-DD'), p.id, p.name, x.deleted_at, x.deleted_by
  FROM termin_payments x JOIN termins t ON t.id = x.termin_id JOIN projects p ON p.id = t.project_id
  WHERE x.deleted_at IS NOT NULL AND t.deleted_at IS NULL AND p.deleted_at IS NULL
  UNION ALL
  SELECT 'expense', x.id, x.description, p.id, p.name, x.deleted_at, x.deleted_by
  FROM expenses x JOIN projects p ON p.id = x.project_id
  WHERE x.deleted_at IS NOT NULL AND p.deleted_at IS NULL
  UNION ALL
  SELECT 'purchase_note', x.id, 'Nota ' || COALESCE(x.note_number, to_char(x.note_date, 'YYYY-MM-DD')), p.id, p.name, x.deleted_at, x.deleted_by
  FROM purchase_notes x JOIN projects p ON p.id = x.project_id
  WHERE x.deleted_at IS NOT NULL AND p.deleted_at IS NULL
  UNION ALL
  SELECT 'document', x.id, x.title, p.id, p.name, x.deleted_at, x.deleted_by
  FROM documents x LEFT JOIN projects p ON p.id = x.project_id
  WHERE x.deleted_at IS NOT NULL AND p.deleted_at IS NULL
  UNION ALL
  SELECT 'client', id, name, NULL, NULL, deleted_at, deleted_by FROM clients WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'vendor', id, name, NULL, NULL, deleted_at, deleted_by FROM vendors WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'tool', id, name, NULL, NULL, deleted_at, deleted_by FROM tools WHERE deleted_at IS NOT NULL
`;

interface TrashRow {
  type: TrashType;
  id: string;
  name: string;
  project_id: string | null;
  project_name: string | null;
  deleted_at: Date;
  deleted_by: string | null;
  deleted_by_name: string | null;
}

/** Tempat Sampah (FR-DEL-6). Hapus/pulihkan per jenis: `soft-delete.ts`. */
@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryTrashDto,
  ): Promise<PaginatedResponse<TrashItemDto>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;
    const type = query.type ?? null;

    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<TrashRow[]>`
        SELECT t.*, u.full_name AS deleted_by_name
        FROM (${TRASH_ROWS}) t LEFT JOIN users u ON u.id = t.deleted_by
        WHERE ${type}::text IS NULL OR t.type = ${type}
        ORDER BY t.deleted_at DESC, t.id
        LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
      `,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total FROM (${TRASH_ROWS}) t
        WHERE ${type}::text IS NULL OR t.type = ${type}
      `,
    ]);

    return paginate(
      rows.map((r) => ({
        type: r.type,
        id: r.id,
        name: r.name,
        projectId: r.project_id,
        projectName: r.project_name,
        deletedAt: r.deleted_at,
        deletedBy: r.deleted_by,
        deletedByName: r.deleted_by_name,
      })),
      { page, perPage, total },
    );
  }

  restore(type: TrashType, id: string): Promise<void> {
    return restoreDeleted(this.prisma, type, id);
  }
}
