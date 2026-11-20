// acme-backend/src/rab/rab.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodeType, Prisma, Project, RabNode, RabStatus } from '@prisma/client';
import { AppRole } from '../common/decorators/roles.decorator';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { assertAcknowledged } from '../common/warnings';
import {
  ItemPurchaseTotals,
  PurchaseStatus,
  purchaseLimitWarnings,
  purchaseStatus,
  purchaseTotalsByNode,
} from '../purchase/purchase-totals';
import { CreateRabNodeDto } from './dto/create-rab-node.dto';
import { UpdateRabNodeProgressDto } from './dto/update-rab-node-progress.dto';
import { UpdateRabNodeDto } from './dto/update-rab-node.dto';
import { RabSummary, calculateRabSummary } from './rab-summary.util';
import {
  RabNodeTree,
  applyRollup,
  buildRabTree,
  descendantIds,
} from './rab-tree.util';

/** Status pembelian item dari baris nota aktif (FR-FIN-3); `null` untuk node grup. */
type RabNodeWithPurchase = RabNode & {
  purchase: {
    purchasedQty: Prisma.Decimal;
    purchasedAmount: bigint;
    vendorCount: number;
    status: PurchaseStatus;
  } | null;
};

function itemPurchase(
  t: ItemPurchaseTotals | undefined,
  volume: Prisma.Decimal | null,
): RabNodeWithPurchase['purchase'] {
  const qty = t?.qty ?? new Prisma.Decimal(0);
  return {
    purchasedQty: qty,
    purchasedAmount: t?.amount ?? 0n,
    vendorCount: t?.vendorCount ?? 0,
    status: purchaseStatus(qty, volume ?? 0),
  };
}

/** Field bentuk-pohon yang divalidasi `assertValidNodeShape` — dipakai create (DTO mentah) & update (hasil merge dengan node lama). */
interface NodeShapeFields {
  volume?: number;
  unit?: string;
  materialPrice?: number;
  laborPrice?: number;
}

/**
 * `rab` — WP-14 (fase-1-vertikal-rab.md §4, simpul tersibuk jalur kritis
 * master §11.4). Aturan yang mengikat SELURUH file ini:
 *
 * 1. `total` (rab_nodes) & `progress` (rab_nodes induk + projects) TAK
 *    PERNAH dihitung di sini — trigger DB (migration.sql: rab_node_set_total,
 *    recompute_project_progress) satu-satunya sumber kebenaran. Service ini
 *    hanya menulis field mentah (volume/harga/progress leaf) dan MEMBACA
 *    hasil trigger, tak pernah menghitung ulang.
 * 2. Otorisasi dua lapis (master §4.8, fase-1 §2.5): `@Roles()` di
 *    controller = gerbang kasar RolesGuard. `assertCanMutate()` di sini
 *    memanggil `PolicyService.canMutateRabNode` — SATU-SATUNYA tempat
 *    aturan "admin ditolak saat rab_status='approved'" ditegakkan.
 * 3. `$transaction([array])` DILARANG untuk `RabNode`/`Project` (model
 *    teraudit) — menggantung senyap (fase-0 pelajaran #1). Semua mutasi di
 *    bawah pakai `await` sekuensial.
 */
@Injectable()
export class RabService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  /**
   * `GET /projects/:id/rab/nodes` — satu query `findMany` mengambil SEMUA
   * node proyek, pohon disusun di memori (`buildRabTree`) — bukan query
   * berulang per level (master §5.4).
   *
   * `rollup` (WP-14b, fase-1 §5b U4) ditempel lewat query SQL TERPISAH
   * (`rollupByNode`) — satu recursive CTE, bukan N+1 per node. Read-only:
   * `recompute_project_progress()` (migration.sql) membuang hasil per-node
   * setelah dipakai mengisi `projects.progress`; field ini menghitung ulang
   * nilai yang sama saat DIBACA, tak pernah ditulis balik ke `rab_nodes`
   * (kolom turunan `computed_progress` DITOLAK — lihat catatan di bawah).
   */
  async getTree(
    projectId: string,
  ): Promise<RabNodeTree<RabNodeWithPurchase>[]> {
    await this.findProjectOrThrow(projectId);
    const [nodes, rollupById, purchaseById] = await Promise.all([
      this.prisma.rabNode.findMany({
        where: { projectId, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.rollupByNode(projectId),
      purchaseTotalsByNode(this.prisma, projectId),
    ]);
    const withPurchase = nodes.map((n) => ({
      ...n,
      purchase:
        n.nodeType === NodeType.item
          ? itemPurchase(purchaseById.get(n.id), n.volume)
          : null,
    }));
    return applyRollup(buildRabTree(withPurchase), rollupById);
  }

  /**
   * `rollup(n) = Σ(total × progress_percent) atas node item keturunan n ÷
   * Σ(total)` (fase-1 §5b U4) — SATU recursive CTE untuk SELURUH pohon
   * proyek, dihitung DB, bukan TypeScript (larangan eksplisit paket: N+1 di
   * pohon ~200 node tak bisa diterima).
   *
   * CTE `descendants` membangun himpunan (ancestor, keturunan-atau-diri-
   * sendiri) untuk TIAP node sekaligus — baris dasar menjadikan tiap node
   * ancestor dari dirinya sendiri, baris rekursif menambah anak. Node
   * `item` otomatis punya rollup = `progress_percent` sendiri karena
   * himpunan keturunannya cuma dirinya (item tak boleh punya anak,
   * ditegakkan `create()`/CHECK DB). `ROUND(...,2)` menyamai presisi
   * `recompute_project_progress()` supaya rollup(akar) bisa dibandingkan
   * SAMA PERSIS dengan `projects.progress` (db-spec ekuivalensi, wajib
   * §5b U4) — bukan cuma dekat.
   */
  private async rollupByNode(projectId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<
      { id: string; rollup: Prisma.Decimal }[]
    >(
      Prisma.sql`
        WITH RECURSIVE descendants AS (
          SELECT "id" AS ancestor_id, "id" AS node_id, "node_type", "total", "progress_percent"
          FROM "rab_nodes"
          WHERE "project_id" = ${projectId}::uuid AND "deleted_at" IS NULL
          UNION ALL
          SELECT d.ancestor_id, rn."id", rn."node_type", rn."total", rn."progress_percent"
          FROM "rab_nodes" rn
          JOIN descendants d ON rn."parent_id" = d.node_id
          WHERE rn."project_id" = ${projectId}::uuid AND rn."deleted_at" IS NULL
        )
        SELECT
          ancestor_id AS id,
          COALESCE(
            ROUND(
              SUM("total" * "progress_percent") FILTER (WHERE "node_type" = 'item')
                / NULLIF(SUM("total") FILTER (WHERE "node_type" = 'item'), 0),
              2
            ),
            0
          ) AS rollup
        FROM descendants
        GROUP BY ancestor_id
      `,
    );
    return new Map(rows.map((row) => [row.id, Number(row.rollup)]));
  }

  /** `POST /projects/:id/rab/nodes`. */
  async create(
    projectId: string,
    dto: CreateRabNodeDto,
    role: AppRole,
  ): Promise<RabNode> {
    const project = await this.findProjectOrThrow(projectId);
    this.assertCanMutate(role, project.rabStatus);

    if (dto.parentId) {
      const parent = await this.prisma.rabNode.findUnique({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent || parent.projectId !== projectId) {
        throw new BadRequestException('parentId tidak ditemukan di proyek ini');
      }
      if (parent.nodeType === NodeType.item) {
        throw new BadRequestException(
          'Node item tak boleh punya anak — parentId tak boleh menunjuk node item',
        );
      }
    } else if (dto.nodeType !== NodeType.section) {
      throw new BadRequestException(
        'Node tanpa parentId (root) harus bertipe section',
      );
    }

    this.assertValidNodeShape(dto.nodeType, dto);

    return this.prisma.rabNode.create({
      data: {
        projectId,
        parentId: dto.parentId ?? null,
        nodeType: dto.nodeType,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        volume: dto.nodeType === NodeType.item ? dto.volume : undefined,
        unit: dto.nodeType === NodeType.item ? dto.unit : undefined,
        materialPrice:
          dto.nodeType === NodeType.item && dto.materialPrice !== undefined
            ? BigInt(dto.materialPrice)
            : undefined,
        laborPrice:
          dto.nodeType === NodeType.item && dto.laborPrice !== undefined
            ? BigInt(dto.laborPrice)
            : undefined,
      },
    });
  }

  /** `PATCH /rab/nodes/:id`. */
  async update(
    id: string,
    dto: UpdateRabNodeDto,
    role: AppRole,
  ): Promise<RabNode> {
    const existing = await this.findNodeOrThrow(id);
    const project = await this.findProjectOrThrow(existing.projectId);
    this.assertCanMutate(role, project.rabStatus);

    let parentId: string | undefined;
    if (dto.parentId !== undefined) {
      const parent = await this.prisma.rabNode.findUnique({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent || parent.projectId !== existing.projectId) {
        throw new BadRequestException('parentId tidak ditemukan di proyek ini');
      }
      if (parent.nodeType === NodeType.item) {
        throw new BadRequestException('Node item tak boleh punya anak');
      }
      const siblingNodes = await this.prisma.rabNode.findMany({
        where: { projectId: existing.projectId },
      });
      if (descendantIds(existing.id, siblingNodes).has(dto.parentId)) {
        throw new BadRequestException(
          'parentId tak boleh keturunan node ini sendiri (siklus)',
        );
      }
      parentId = dto.parentId;
    }

    // Nilai efektif setelah patch — dipakai memvalidasi bentuk pohon TANPA
    // melanggar CHECK DB pada field yang tak ikut diubah. `??` juga
    // menutup celah null eksplisit dari klien (class-validator meloloskan
    // `null` lewat @IsOptional()): null diperlakukan sama seperti "tak
    // dikirim", bukan "hapus nilai" — endpoint ini tak mendukung
    // pengosongan field harga.
    const merged: NodeShapeFields = {
      volume: dto.volume ?? existing.volume?.toNumber(),
      unit: dto.unit ?? existing.unit ?? undefined,
      materialPrice:
        dto.materialPrice ??
        (existing.materialPrice !== null
          ? Number(existing.materialPrice)
          : undefined),
      laborPrice:
        dto.laborPrice ??
        (existing.laborPrice !== null
          ? Number(existing.laborPrice)
          : undefined),
    };
    this.assertValidNodeShape(existing.nodeType, merged);

    const isItem = existing.nodeType === NodeType.item;
    // Volume/harga material = batas Σ baris nota → cek pola A yang sama dengan nota (FR-FIN-3).
    if (isItem && (dto.volume != null || dto.materialPrice != null)) {
      const bought = (
        await purchaseTotalsByNode(this.prisma, existing.projectId)
      ).get(id);
      if (bought) {
        assertAcknowledged(
          purchaseLimitWarnings(
            {
              ...existing,
              volume: new Prisma.Decimal(merged.volume ?? 0),
              materialPrice: BigInt(merged.materialPrice ?? 0),
            },
            bought.qty,
            bought.amount,
          ),
          dto.acknowledgeWarnings,
        );
      }
    }
    return this.prisma.rabNode.update({
      where: { id },
      data: {
        parentId,
        name: dto.name,
        sortOrder: dto.sortOrder,
        volume: isItem ? merged.volume : undefined,
        unit: isItem ? merged.unit : undefined,
        materialPrice:
          isItem && merged.materialPrice !== undefined
            ? BigInt(merged.materialPrice)
            : undefined,
        laborPrice:
          isItem && merged.laborPrice !== undefined
            ? BigInt(merged.laborPrice)
            : undefined,
      },
    });
  }

  /** `DELETE /rab/nodes/:id` — soft delete; turunan & baris nota pada node itu ikut tersembunyi (FR-DEL-3). */
  async remove(id: string, role: AppRole, userId: string): Promise<void> {
    const existing = await this.findNodeOrThrow(id);
    const project = await this.findProjectOrThrow(existing.projectId);
    this.assertCanMutate(role, project.rabStatus);
    await softDelete(this.prisma, 'rab_node', id, userId);
  }

  /**
   * `PATCH /rab/nodes/:id/progress` — leaf saja (fase-1 §4 WP-14 aturan
   * #3). SENGAJA TAK memanggil `assertCanMutate`/`PolicyService` — baris
   * matriks §4.8 untuk `progress_percent` mengizinkan pimpinan & admin
   * tanpa syarat `rab_status`, beda dari create/update/delete.
   */
  async updateProgress(
    id: string,
    dto: UpdateRabNodeProgressDto,
  ): Promise<RabNode> {
    const existing = await this.findNodeOrThrow(id);
    if (existing.nodeType !== NodeType.item) {
      throw new BadRequestException(
        'progress_percent hanya berlaku untuk node item',
      );
    }
    const childCount = await this.prisma.rabNode.count({
      where: { parentId: id, deletedAt: null },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'progress_percent hanya boleh diset pada node leaf (tak punya anak)',
      );
    }
    return this.prisma.rabNode.update({
      where: { id },
      data: { progressPercent: dto.progressPercent },
    });
  }

  /**
   * `POST /projects/:id/rab/approve` — draft → approved. Hanya menulis
   * `rab_status`/`rab_approved_*`; trigger `project_recompute_on_approve_trg`
   * (migration.sql) yang mengisi `projects.progress` — tak dihitung di sini.
   */
  async approve(projectId: string, userId: string): Promise<Project> {
    const project = await this.findProjectOrThrow(projectId);
    if (project.rabStatus === RabStatus.approved) {
      throw new BadRequestException('RAB proyek ini sudah di-approve');
    }
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        rabStatus: RabStatus.approved,
        rabApprovedBy: userId,
        rabApprovedAt: new Date(),
      },
    });
  }

  /**
   * `GET /projects/:id/rab/summary` — master §5.6. Σ `total` node `item`
   * (kolom yang DIISI TRIGGER, dijumlahkan lewat `aggregate`, tak dihitung
   * ulang) → `calculateRabSummary` (fungsi murni, `rab-summary.util.ts`).
   */
  async summary(projectId: string): Promise<RabSummary> {
    const project = await this.findProjectOrThrow(projectId);
    const agg = await this.prisma.rabNode.aggregate({
      where: { projectId, nodeType: NodeType.item, deletedAt: null },
      _sum: { total: true },
    });
    const subtotal = Number(agg._sum.total ?? 0n);
    return calculateRabSummary(
      subtotal,
      project.ppnEnabled,
      Number(project.ppnRate),
    );
  }

  /**
   * Satu-satunya pemanggil `PolicyService.canMutateRabNode` di modul ini
   * (master §4.8, fase-1 §2.5 aturan #1). Dilarang menulis ulang logikanya
   * di controller.
   */
  private assertCanMutate(role: AppRole, rabStatus: RabStatus): void {
    if (!this.policy.canMutateRabNode(role, rabStatus)) {
      throw new ForbiddenException(
        'Admin tak boleh mengubah RAB yang sudah di-approve — hanya pimpinan yang bisa',
      );
    }
  }

  /**
   * Validasi bentuk pohon (master §4.3, fase-1 §4 WP-14 aturan #4): node
   * `item` wajib `volume`+`unit`+minimal satu harga; node grup
   * (section/subgroup/phase) dilarang punya field-field itu sama sekali.
   * Cermin aplikasi dari CHECK `rab_nodes_item_vs_group_fields`
   * (migration.sql) — dijaga di sini juga supaya klien dapat pesan 400
   * yang jelas, bukan error constraint Postgres mentah.
   */
  private assertValidNodeShape(
    nodeType: NodeType,
    fields: NodeShapeFields,
  ): void {
    if (nodeType === NodeType.item) {
      if (fields.volume === undefined || fields.unit === undefined) {
        throw new BadRequestException('Node item wajib punya volume dan unit');
      }
      if (
        fields.materialPrice === undefined &&
        fields.laborPrice === undefined
      ) {
        throw new BadRequestException(
          'Node item wajib punya minimal salah satu dari materialPrice/laborPrice',
        );
      }
      return;
    }

    if (
      fields.volume !== undefined ||
      fields.unit !== undefined ||
      fields.materialPrice !== undefined ||
      fields.laborPrice !== undefined
    ) {
      throw new BadRequestException(
        'Node grup (section/subgroup/phase) tak boleh punya volume/unit/materialPrice/laborPrice',
      );
    }
  }

  private async findProjectOrThrow(projectId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan');
    return project;
  }

  private async findNodeOrThrow(id: string): Promise<RabNode> {
    const node = await this.prisma.rabNode.findUnique({
      where: { id, deletedAt: null },
    });
    if (!node) throw new NotFoundException('Node RAB tidak ditemukan');
    return node;
  }
}
