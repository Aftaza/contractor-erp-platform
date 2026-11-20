// acme-backend/src/project-tools/project-tools.service.spec.ts
//
// Unit test (Prisma mock + PolicyService NYATA — bukan mock, supaya
// aturan `canMutateProjectTool` yang sesungguhnya ikut teruji lewat modul
// ini juga, pola sama seperti rab.service.spec.ts) untuk ProjectToolsService.
// Test yang butuh Postgres nyata ada di project-tools.db-spec.ts.
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectToolApprovalStatus } from '@prisma/client';
import { PolicyService } from '../policy/policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectToolDto } from './dto/create-project-tool.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectToolsService } from './project-tools.service';

type MutateArgs = { data: Record<string, unknown> };

type MockPrisma = {
  project: { findUnique: jest.Mock };
  tool: { findUnique: jest.Mock };
  projectTool: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock<Promise<unknown>, [MutateArgs]>;
    update: jest.Mock<Promise<unknown>, [MutateArgs]>;
  };
};

function makePrismaMock(): MockPrisma {
  return {
    project: { findUnique: jest.fn() },
    tool: { findUnique: jest.fn() },
    projectTool: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn<Promise<unknown>, [MutateArgs]>(),
      update: jest.fn<Promise<unknown>, [MutateArgs]>(),
    },
  };
}

const PROJECT_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const TOOL_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
const OWNER_ID = 'cccccccc-0000-4000-8000-000000000003';
const OTHER_USER_ID = 'dddddddd-0000-4000-8000-000000000004';
const ROW_ID = 'eeeeeeee-0000-4000-8000-000000000005';

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ROW_ID,
    projectId: PROJECT_ID,
    toolId: TOOL_ID,
    quantity: 1,
    usedFrom: null,
    usedTo: null,
    approvalStatus: ProjectToolApprovalStatus.pending,
    approvedBy: null,
    approvedAt: null,
    recordedBy: OWNER_ID,
    notes: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('ProjectToolsService', () => {
  let prisma: MockPrisma;
  let service: ProjectToolsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ProjectToolsService(
      prisma as unknown as PrismaService,
      new PolicyService(),
      // Emitter notifikasi (fase-2 §2.3) di-stub: unit test ini sengaja bebas
      // DB. Efek nyatanya — satu baris per pimpinan aktif — diuji terhadap
      // Postgres asli di `src/notifications/notifications.db-spec.ts`.
      {
        notifyRole: jest.fn().mockResolvedValue(undefined),
      } as unknown as NotificationsService,
    );
  });

  describe('findAllByProject', () => {
    it('melempar NotFoundException kalau proyek tak ada', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findAllByProject(PROJECT_ID, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('membungkus bentuk {data, meta} master §3.2, scoped ke proyek', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
      prisma.projectTool.findMany.mockResolvedValue([baseRow()]);
      prisma.projectTool.count.mockResolvedValue(1);

      const result = await service.findAllByProject(PROJECT_ID, {});

      expect(prisma.projectTool.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: PROJECT_ID } }),
      );
      expect(result.meta).toEqual({ page: 1, perPage: 25, total: 1 });
    });
  });

  describe('create', () => {
    const dto: CreateProjectToolDto = { toolId: TOOL_ID };

    it('melempar NotFoundException kalau proyek tak ada', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(
        service.create(PROJECT_ID, dto, OWNER_ID, 'staff_gudang'),
      ).rejects.toThrow(NotFoundException);
    });

    it('melempar BadRequestException kalau toolId tak ditemukan', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
      prisma.tool.findUnique.mockResolvedValue(null);
      await expect(
        service.create(PROJECT_ID, dto, OWNER_ID, 'staff_gudang'),
      ).rejects.toThrow(BadRequestException);
    });

    it('staff_gudang: baris lahir approvalStatus=pending & recordedBy=dirinya, TAK BISA dioverride', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
      prisma.tool.findUnique.mockResolvedValue({ id: TOOL_ID });
      prisma.projectTool.create.mockResolvedValue(baseRow());

      await service.create(PROJECT_ID, dto, OWNER_ID, 'staff_gudang');

      const call = prisma.projectTool.create.mock.calls[0][0];
      expect(call.data.approvalStatus).toBe(ProjectToolApprovalStatus.pending);
      expect(call.data.recordedBy).toBe(OWNER_ID);
    });

    it('admin ditolak — canMutateProjectTool bernilai false untuk role admin', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: PROJECT_ID });
      prisma.tool.findUnique.mockResolvedValue({ id: TOOL_ID });

      await expect(
        service.create(PROJECT_ID, dto, OWNER_ID, 'admin'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.projectTool.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('melempar NotFoundException kalau baris tak ada', async () => {
      prisma.projectTool.findUnique.mockResolvedValue(null);
      await expect(
        service.update(ROW_ID, {}, OWNER_ID, 'staff_gudang'),
      ).rejects.toThrow(NotFoundException);
    });

    it('staff_gudang pemilik baris pending → boleh', async () => {
      prisma.projectTool.findUnique.mockResolvedValue(baseRow());
      prisma.projectTool.update.mockResolvedValue(baseRow({ notes: 'ok' }));

      const result = await service.update(
        ROW_ID,
        { notes: 'ok' },
        OWNER_ID,
        'staff_gudang',
      );
      expect(result.notes).toBe('ok');
    });

    it('staff_gudang BUKAN pemilik baris → ForbiddenException (PolicyService, bukan controller)', async () => {
      prisma.projectTool.findUnique.mockResolvedValue(baseRow());
      await expect(
        service.update(ROW_ID, { notes: 'x' }, OTHER_USER_ID, 'staff_gudang'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.projectTool.update).not.toHaveBeenCalled();
    });

    it('staff_gudang pemilik tapi baris sudah approved → ForbiddenException', async () => {
      prisma.projectTool.findUnique.mockResolvedValue(
        baseRow({ approvalStatus: ProjectToolApprovalStatus.approved }),
      );
      await expect(
        service.update(ROW_ID, { notes: 'x' }, OWNER_ID, 'staff_gudang'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.projectTool.update).not.toHaveBeenCalled();
    });

    it('pimpinan selalu boleh, terlepas status/pemilik', async () => {
      prisma.projectTool.findUnique.mockResolvedValue(
        baseRow({ approvalStatus: ProjectToolApprovalStatus.approved }),
      );
      prisma.projectTool.update.mockResolvedValue(baseRow());

      await service.update(ROW_ID, { notes: 'x' }, OTHER_USER_ID, 'pimpinan');
      expect(prisma.projectTool.update).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('melempar NotFoundException kalau baris tak ada', async () => {
      prisma.projectTool.findUnique.mockResolvedValue(null);
      await expect(
        service.approve(ROW_ID, { approvalStatus: 'approved' }, OWNER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('menolak approve bila alatnya sudah dihapus (FR-DEL-4)', async () => {
      prisma.projectTool.findUnique.mockResolvedValue(baseRow());
      prisma.tool.findUnique.mockResolvedValue(null);
      await expect(
        service.approve(ROW_ID, { approvalStatus: 'approved' }, 'pimpinan-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.projectTool.update).not.toHaveBeenCalled();
    });

    it('mengisi approvedBy + approvedAt', async () => {
      prisma.projectTool.findUnique.mockResolvedValue(baseRow());
      prisma.tool.findUnique.mockResolvedValue({ id: 'tool-1' });
      prisma.projectTool.update.mockResolvedValue(
        baseRow({
          approvalStatus: ProjectToolApprovalStatus.approved,
          approvedBy: 'pimpinan-1',
          approvedAt: new Date(),
        }),
      );

      await service.approve(
        ROW_ID,
        { approvalStatus: 'approved' },
        'pimpinan-1',
      );

      const call = prisma.projectTool.update.mock.calls[0][0];
      expect(call.data.approvedBy).toBe('pimpinan-1');
      expect(call.data.approvalStatus).toBe('approved');
      expect(call.data.approvedAt).toBeInstanceOf(Date);
    });
  });
});
