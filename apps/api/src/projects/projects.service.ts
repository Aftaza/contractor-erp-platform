// acme-backend/src/projects/projects.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Project } from '@prisma/client';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectPublicationDto } from './dto/update-project-publication.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

/**
 * Bentuk response proyek. `contractValue` di DB adalah `bigint` — tak bisa
 * lolos `JSON.stringify` bawaan Express (beda dengan `Decimal` milik
 * `progress`/`ppnRate`, yang sudah punya `toJSON()` sendiri). Dikonversi ke
 * `number` di sini; nilai kontrak proyek konstruksi jauh di bawah
 * `Number.MAX_SAFE_INTEGER` (±9 kuadriliun rupiah).
 */
export type ProjectResponse = Omit<Project, 'contractValue'> & {
  contractValue: number | null;
  clientName: string | null;
  /** Klien sudah dihapus — nama tetap tampil, UI melabelinya "dihapus" (FR-DEL-4). */
  clientDeleted: boolean;
};

/** Hasil query Prisma dengan relasi klien disertakan (hanya `name`, T11). */
type ProjectWithClient = Project & {
  client: { name: string; deletedAt: Date | null } | null;
};

const CLIENT_NAME_INCLUDE = {
  client: { select: { name: true as const, deletedAt: true as const } },
};

function toResponse(project: ProjectWithClient): ProjectResponse {
  const { client, ...rest } = project;
  return {
    ...rest,
    contractValue:
      rest.contractValue === null ? null : Number(rest.contractValue),
    clientName: client?.name ?? null,
    clientDeleted: !!client?.deletedAt,
  };
}

/**
 * `projects` — WP-13 (fase-1-vertikal-rab.md §4). SENGAJA TAK menghitung
 * agregat RAB/PPN di sini (batas modul fase-1 §2.5) — itu milik WP-14 lewat
 * `GET /projects/:id/rab/summary`. `progress` yang dikembalikan di bawah
 * murni kolom cache yang diisi trigger DB, bukan dihitung ulang aplikasi.
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryProjectsDto,
  ): Promise<PaginatedResponse<ProjectResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: CLIENT_NAME_INCLUDE,
      }),
      this.prisma.project.count({ where: { deletedAt: null } }),
    ]);

    return paginate(rows.map(toResponse), { page, perPage, total });
  }

  async findOne(id: string): Promise<ProjectResponse> {
    return toResponse(await this.findOrThrow(id));
  }

  async create(
    dto: CreateProjectDto,
    userId: string,
  ): Promise<ProjectResponse> {
    await this.assertActiveClient(dto.clientId);
    const project = await this.prisma.project
      .create({
        data: {
          name: dto.name,
          clientId: dto.clientId,
          location: dto.location,
          contractType: dto.contractType,
          status: dto.status,
          contractValue:
            dto.contractValue !== undefined
              ? BigInt(dto.contractValue)
              : undefined,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          description: dto.description,
          ppnEnabled: dto.ppnEnabled,
          ppnRate: dto.ppnRate,
          createdBy: userId,
        },
        include: CLIENT_NAME_INCLUDE,
      })
      .catch((err: unknown) => this.rethrowForeignKeyError(err));

    return toResponse(project);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectResponse> {
    await this.findOrThrow(id);
    await this.assertActiveClient(dto.clientId);

    const project = await this.prisma.project
      .update({
        where: { id },
        data: {
          name: dto.name,
          clientId: dto.clientId,
          location: dto.location,
          contractType: dto.contractType,
          status: dto.status,
          contractValue:
            dto.contractValue !== undefined
              ? BigInt(dto.contractValue)
              : undefined,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate:
            dto.endDate !== undefined ? new Date(dto.endDate) : undefined,
          description: dto.description,
          ppnEnabled: dto.ppnEnabled,
          ppnRate: dto.ppnRate,
        },
        include: CLIENT_NAME_INCLUDE,
      })
      .catch((err: unknown) => this.rethrowForeignKeyError(err));

    return toResponse(project);
  }

  /** Kaskade: node RAB, termin & pembayaran, pengeluaran, nota, addendum, dokumen, sub-proyek (FR-DEL-3). */
  async remove(id: string, userId: string): Promise<void> {
    await this.findOrThrow(id);
    await softDelete(this.prisma, 'project', id, userId);
  }

  /**
   * HANYA menyentuh `is_published` + kolom `public_*` — tak pernah digabung
   * ke `update()` (fase-1 §4 WP-13: pemisahan kolom publik/internal
   * disengaja, mencegah kebocoran nilai kontrak ke situs publik nanti).
   */
  async updatePublication(
    id: string,
    dto: UpdateProjectPublicationDto,
  ): Promise<ProjectResponse> {
    await this.findOrThrow(id);

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        isPublished: dto.isPublished,
        publicTitle: dto.publicTitle,
        publicSummary: dto.publicSummary,
        publicCategory: dto.publicCategory,
        publicImages: dto.publicImages,
      },
      include: CLIENT_NAME_INCLUDE,
    });

    return toResponse(project);
  }

  private async findOrThrow(id: string): Promise<ProjectWithClient> {
    const project = await this.prisma.project.findUnique({
      where: { id, deletedAt: null },
      include: CLIENT_NAME_INCLUDE,
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan');
    return project;
  }

  /** Klien terhapus tak bisa dipilih untuk data baru (FR-DEL-4). */
  private async assertActiveClient(clientId?: string): Promise<void> {
    if (
      clientId &&
      !(await this.prisma.client.count({
        where: { id: clientId, deletedAt: null },
      }))
    ) {
      throw new BadRequestException('client_id tidak ditemukan');
    }
  }

  /**
   * `client_id` menunjuk baris yang tak ada → FK violation (Postgres P2003)
   * lewat Prisma. Dipetakan ke 400 tervalidasi di sini, bukan dibiarkan
   * jatuh ke 500 generik `HttpExceptionFilter`.
   */
  private rethrowForeignKeyError(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2003'
    ) {
      throw new BadRequestException('client_id tidak ditemukan');
    }
    throw err;
  }
}
