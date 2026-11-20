// acme-backend/src/tools/tools.service.spec.ts
//
// Unit test (Prisma mock — master §9.1) untuk ToolsService. Test yang butuh
// Postgres nyata (unique `code`, audit) ada di tools.db-spec.ts.
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { CreateToolDto } from './dto/create-tool.dto';
import { ToolsService } from './tools.service';

jest.mock('../trash/soft-delete', () => ({ softDelete: jest.fn() }));

type MutateArgs = { data: Record<string, unknown> };

type MockPrisma = {
  tool: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock<Promise<unknown>, [MutateArgs]>;
    update: jest.Mock<Promise<unknown>, [MutateArgs]>;
    delete: jest.Mock;
  };
  projectTool: { count: jest.Mock };
};

function makePrismaMock(): MockPrisma {
  return {
    tool: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn<Promise<unknown>, [MutateArgs]>(),
      update: jest.fn<Promise<unknown>, [MutateArgs]>(),
      delete: jest.fn(),
    },
    projectTool: { count: jest.fn() },
  };
}

const BASE_TOOL = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  code: 'ALT-001',
  name: 'Bor Listrik',
  category: 'Elektrik',
  quantity: 3,
  condition: 'baik',
  status: 'tersedia' as const,
  notes: null,
  createdBy: 'bbbbbbbb-0000-4000-8000-000000000002',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('ToolsService', () => {
  let prisma: MockPrisma;
  let service: ToolsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ToolsService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('memakai default page=1, perPage=25 dan membungkus bentuk {data, meta} master §3.2', async () => {
      prisma.tool.findMany.mockResolvedValue([BASE_TOOL]);
      prisma.tool.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(prisma.tool.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 25 }),
      );
      expect(result.meta).toEqual({ page: 1, perPage: 25, total: 1 });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('melempar NotFoundException kalau alat tak ada', async () => {
      prisma.tool.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('mengembalikan alat yang ditemukan', async () => {
      prisma.tool.findUnique.mockResolvedValue(BASE_TOOL);
      const result = await service.findOne(BASE_TOOL.id);
      expect(result.id).toBe(BASE_TOOL.id);
    });
  });

  describe('create', () => {
    const dto: CreateToolDto = { name: 'Bor Listrik' };

    it('menyertakan createdBy dari user pemanggil', async () => {
      prisma.tool.create.mockResolvedValue(BASE_TOOL);

      await service.create(dto, 'user-1');

      const call = prisma.tool.create.mock.calls[0][0];
      expect(call.data.createdBy).toBe('user-1');
    });

    it('konflik `code` unik (Prisma P2002) → dipetakan jadi BadRequestException yang menyebut field', async () => {
      prisma.tool.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique violation', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dto, 'user-1')).rejects.toThrow(/code/);
    });

    it('error Prisma lain tetap dilempar apa adanya', async () => {
      const other = new Error('kegagalan tak terduga');
      prisma.tool.create.mockRejectedValue(other);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(other);
    });
  });

  describe('update', () => {
    it('melempar NotFoundException kalau alat tak ada', async () => {
      prisma.tool.findUnique.mockResolvedValue(null);
      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.tool.update).not.toHaveBeenCalled();
    });

    it('konflik `code` unik saat update → BadRequestException', async () => {
      prisma.tool.findUnique.mockResolvedValue(BASE_TOOL);
      prisma.tool.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique violation', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.update(BASE_TOOL.id, { code: 'DUPLIKAT' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('melempar NotFoundException kalau alat tak ada', async () => {
      prisma.tool.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(softDelete).not.toHaveBeenCalled();
    });

    it('menolak (409) hapus alat yang pemakaiannya approved/handed_over (FR-DEL-4)', async () => {
      prisma.tool.findUnique.mockResolvedValue(BASE_TOOL);
      prisma.projectTool.count.mockResolvedValue(1);

      await expect(service.remove(BASE_TOOL.id, 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.projectTool.count).toHaveBeenCalledWith({
        where: {
          toolId: BASE_TOOL.id,
          project: { deletedAt: null },
          approvalStatus: { in: ['approved', 'handed_over'] },
        },
      });
      expect(softDelete).not.toHaveBeenCalled();
    });

    it('soft delete lewat softDelete (FR-DEL-1)', async () => {
      prisma.tool.findUnique.mockResolvedValue(BASE_TOOL);
      prisma.projectTool.count.mockResolvedValue(0);

      await service.remove(BASE_TOOL.id, 'user-1');
      expect(softDelete).toHaveBeenCalledWith(
        prisma,
        'tool',
        BASE_TOOL.id,
        'user-1',
      );
    });
  });

  describe('updateStatus', () => {
    it('melempar NotFoundException kalau alat tak ada', async () => {
      prisma.tool.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('missing-id', { status: 'dipakai' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('HANYA mengubah kolom status', async () => {
      prisma.tool.findUnique.mockResolvedValue(BASE_TOOL);
      prisma.tool.update.mockResolvedValue({
        ...BASE_TOOL,
        status: 'dipakai',
      });

      await service.updateStatus(BASE_TOOL.id, { status: 'dipakai' });

      expect(prisma.tool.update).toHaveBeenCalledWith({
        where: { id: BASE_TOOL.id },
        data: { status: 'dipakai' },
      });
    });
  });
});
