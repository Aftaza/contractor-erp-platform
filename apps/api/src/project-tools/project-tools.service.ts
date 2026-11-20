// acme-backend/src/project-tools/project-tools.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Project,
  ProjectTool,
  ProjectToolApprovalStatus,
  Tool,
} from '@prisma/client';
import { AppRole } from '../common/decorators/roles.decorator';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { AppLogger } from '../common/logger/app-logger.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveProjectToolDto } from './dto/approve-project-tool.dto';
import { CreateProjectToolDto } from './dto/create-project-tool.dto';
import { QueryProjectToolsDto } from './dto/query-project-tools.dto';
import { UpdateProjectToolDto } from './dto/update-project-tool.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

/**
 * `project-tools` — WP-18 (fase-2-keuangan-operasional.md §4). Aturan yang
 * mengikat seluruh file ini:
 *
 * 1. Otorisasi DUA LAPIS, JANGAN DICAMPUR (pelajaran fase-0 #5, dicontohkan
 *    `rab.service.ts`): `@Roles()` di controller = gerbang kasar
 *    `RolesGuard` (baris matriks `test/authz/rows/project-tools.rows.ts`).
 *    Penolakan staff_gudang atas baris MILIK ORANG LAIN atau yang SUDAH
 *    non-`pending` datang SATU-SATUNYA dari `PolicyService.canMutateProjectTool`,
 *    dipanggil dari `assertCanMutate()` di bawah. TAK ADA `if (role === ...)`.
 * 2. `POST` selalu lahir `approvalStatus='pending'`, `recordedBy` dari
 *    `req.user.id` — tak pernah dari body (DTO tak punya field itu sama
 *    sekali, fase-2 §4 WP-18 "Isi").
 * 3. Notifikasi ke pimpinan saat baris `pending` tercipta — DITAMBAHKAN
 *    WP-19 (fase-2 §2.3: serah-terima kepemilikan lintas gelombang; satu
 *    pemanggilan saja, sisanya file ini tak diubah). Kegagalan notifikasi
 *    SENGAJA tak menggagalkan pencatatan alat: barisnya sudah tersimpan di
 *    titik itu, jadi melempar error hanya membuat operasi yang berhasil
 *    terlihat gagal. Errornya DI-LOG, bukan ditelan diam-diam.
 */
@Injectable()
export class ProjectToolsService {
  private readonly logger = new AppLogger(ProjectToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAllByProject(
    projectId: string,
    query: QueryProjectToolsDto,
  ): Promise<PaginatedResponse<ProjectTool>> {
    await this.findProjectOrThrow(projectId);
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.projectTool.findMany({
        where: { projectId },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.projectTool.count({ where: { projectId } }),
    ]);

    return paginate(rows, { page, perPage, total });
  }

  /** `POST /projects/:id/project-tools`. */
  async create(
    projectId: string,
    dto: CreateProjectToolDto,
    userId: string,
    role: AppRole,
  ): Promise<ProjectTool> {
    const project = await this.findProjectOrThrow(projectId);
    const tool = await this.findToolOrThrow(dto.toolId);

    // Baris baru selalu recordedBy=diri sendiri & pending — subjek yang
    // dicek di sini selalu cocok untuk pemanggil yang lolos RolesGuard, tapi
    // dipanggil eksplisit supaya PolicyService tetap satu-satunya sumber
    // kebenaran (fase-2 §4 WP-18 tabel endpoint: baris POST juga
    // menyebut `PolicyService.canMutateProjectTool`).
    this.assertCanMutate(role, userId, {
      recordedByUserId: userId,
      approvalStatus: ProjectToolApprovalStatus.pending,
    });

    const created = await this.prisma.projectTool.create({
      data: {
        projectId,
        toolId: dto.toolId,
        quantity: dto.quantity,
        usedFrom: dto.usedFrom ? new Date(dto.usedFrom) : undefined,
        usedTo: dto.usedTo ? new Date(dto.usedTo) : undefined,
        notes: dto.notes,
        approvalStatus: ProjectToolApprovalStatus.pending,
        recordedBy: userId,
      },
    });

    // fase-2 §2.3 — satu-satunya pemanggilan lintas modul di file ini.
    // Sengaja SETELAH create dan di luar jalur error: lihat butir 3 di
    // dokumentasi kelas.
    try {
      await this.notifications.notifyRole('pimpinan', {
        type: 'warning',
        title: 'Pemakaian alat menunggu persetujuan',
        message: `${tool.name} diajukan untuk proyek ${project.name}.`,
        link: `/projects/${projectId}/tools`,
      });
    } catch (error) {
      this.logger.warn('Gagal menerbitkan notifikasi pemakaian alat', {
        projectToolId: created.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return created;
  }

  /** `PATCH /project-tools/:id`. */
  async update(
    id: string,
    dto: UpdateProjectToolDto,
    userId: string,
    role: AppRole,
  ): Promise<ProjectTool> {
    const existing = await this.findOrThrow(id);
    this.assertCanMutate(role, userId, {
      recordedByUserId: existing.recordedBy ?? '',
      approvalStatus: existing.approvalStatus,
    });

    if (dto.toolId) {
      await this.findToolOrThrow(dto.toolId);
    }

    return this.prisma.projectTool.update({
      where: { id },
      data: {
        toolId: dto.toolId,
        quantity: dto.quantity,
        usedFrom: dto.usedFrom ? new Date(dto.usedFrom) : undefined,
        usedTo: dto.usedTo ? new Date(dto.usedTo) : undefined,
        notes: dto.notes,
      },
    });
  }

  /** `PATCH /project-tools/:id/approve` — pimpinan saja (gerbang `@Roles('pimpinan')`, tak butuh `PolicyService`). */
  async approve(
    id: string,
    dto: ApproveProjectToolDto,
    approverUserId: string,
  ): Promise<ProjectTool> {
    const row = await this.findOrThrow(id);
    // Alat terhapus tak bisa disetujui untuk dipakai (FR-DEL-4); menolak tetap boleh.
    if (dto.approvalStatus === ProjectToolApprovalStatus.approved) {
      await this.findToolOrThrow(row.toolId);
    }
    return this.prisma.projectTool.update({
      where: { id },
      data: {
        approvalStatus: dto.approvalStatus,
        approvedBy: approverUserId,
        approvedAt: new Date(),
      },
    });
  }

  private async findOrThrow(id: string): Promise<ProjectTool> {
    // Pemakaian pada proyek terhapus ikut tersembunyi (FR-DEL-3).
    const row = await this.prisma.projectTool.findUnique({
      where: { id, project: { deletedAt: null } },
    });
    if (!row) throw new NotFoundException('Pemakaian alat tidak ditemukan');
    return row;
  }

  // Mengembalikan barisnya (bukan void) supaya `create()` bisa menyebut nama
  // proyek & alat di pesan notifikasi tanpa query kedua. Pemanggil lain
  // mengabaikan nilai baliknya — tetap kompatibel.
  private async findProjectOrThrow(projectId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan');
    return project;
  }

  private async findToolOrThrow(toolId: string): Promise<Tool> {
    const tool = await this.prisma.tool.findUnique({
      where: { id: toolId, deletedAt: null },
    });
    if (!tool) throw new BadRequestException('toolId tidak ditemukan');
    return tool;
  }

  /**
   * Satu-satunya pemanggil `PolicyService.canMutateProjectTool` di modul
   * ini (master §4.8, fase-2 §4 WP-18). Dilarang menulis ulang logikanya
   * di controller.
   */
  private assertCanMutate(
    role: AppRole,
    requestingUserId: string,
    subject: {
      recordedByUserId: string;
      approvalStatus: ProjectToolApprovalStatus;
    },
  ): void {
    if (!this.policy.canMutateProjectTool(role, requestingUserId, subject)) {
      throw new ForbiddenException(
        'Hanya pemilik baris (staff_gudang) yang masih pending, atau pimpinan, yang boleh mengubah pemakaian alat ini',
      );
    }
  }
}
