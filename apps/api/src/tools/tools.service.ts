// acme-backend/src/tools/tools.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectToolApprovalStatus, Tool } from '@prisma/client';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { CreateToolDto } from './dto/create-tool.dto';
import { QueryToolsDto } from './dto/query-tools.dto';
import { UpdateToolStatusDto } from './dto/update-tool-status.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

/**
 * `tools` — WP-18 (fase-2-keuangan-operasional.md §4). Otorisasi MURNI
 * lewat `@Roles()` di controller (matriks master §4.8: "tools — CRUD +
 * update status" = pimpinan ✅ admin ❌ staff_gudang ✅) — tak ada aturan
 * berbasis STATE data seperti `rab`/`project_tools`, jadi `PolicyService`
 * TAK dipanggil dari service ini (bandingkan `project-tools.service.ts`,
 * yang memang harus).
 */
@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryToolsDto): Promise<PaginatedResponse<Tool>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.tool.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tool.count({ where: { deletedAt: null } }),
    ]);

    return paginate(rows, { page, perPage, total });
  }

  async findOne(id: string): Promise<Tool> {
    return this.findOrThrow(id);
  }

  async create(dto: CreateToolDto, userId: string): Promise<Tool> {
    return this.prisma.tool
      .create({
        data: {
          code: dto.code,
          name: dto.name,
          category: dto.category,
          quantity: dto.quantity,
          condition: dto.condition,
          notes: dto.notes,
          createdBy: userId,
        },
      })
      .catch((err: unknown) => this.rethrowUniqueCodeError(err));
  }

  async update(id: string, dto: UpdateToolDto): Promise<Tool> {
    await this.findOrThrow(id);

    return this.prisma.tool
      .update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          category: dto.category,
          quantity: dto.quantity,
          condition: dto.condition,
          notes: dto.notes,
        },
      })
      .catch((err: unknown) => this.rethrowUniqueCodeError(err));
  }

  /** Ditolak bila alat masih disetujui/diserahkan ke proyek (FR-DEL-4). */
  async remove(id: string, userId: string): Promise<void> {
    await this.findOrThrow(id);
    const inUse = await this.prisma.projectTool.count({
      where: {
        toolId: id,
        project: { deletedAt: null },
        approvalStatus: {
          in: [
            ProjectToolApprovalStatus.approved,
            ProjectToolApprovalStatus.handed_over,
          ],
        },
      },
    });
    if (inUse > 0) {
      throw new ConflictException(
        'Alat sedang dipakai (pemakaian disetujui/diserahkan) — selesaikan pemakaiannya dulu',
      );
    }
    await softDelete(this.prisma, 'tool', id, userId);
  }

  /** `PATCH /tools/:id/status` — sumbu terpisah dari `update()` (master §4.6). */
  async updateStatus(id: string, dto: UpdateToolStatusDto): Promise<Tool> {
    await this.findOrThrow(id);
    return this.prisma.tool.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  private async findOrThrow(id: string): Promise<Tool> {
    const tool = await this.prisma.tool.findUnique({
      where: { id, deletedAt: null },
    });
    if (!tool) throw new NotFoundException('Alat tidak ditemukan');
    return tool;
  }

  /**
   * `tools.code` unik di antara alat aktif (indeks unik parsial
   * `tools_code_active_key`, FR-DEL-5), nullable — konflik dipetakan ke
   * 400 yang menyebut field, bukan error Postgres mentah P2002 (aturan
   * spesifikasi WP-18 "Aturan isi").
   */
  private rethrowUniqueCodeError(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new BadRequestException('code sudah dipakai alat lain');
    }
    throw err;
  }
}
