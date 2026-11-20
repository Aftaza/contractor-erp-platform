// acme-backend/src/projects/projects.service.spec.ts
//
// Unit test (Prisma mock — master §9.1) untuk ProjectsService. Test yang
// butuh Postgres nyata (audit_logs, trigger) ada di projects.db-spec.ts.
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

jest.mock('../trash/soft-delete', () => ({ softDelete: jest.fn() }));

/** Bentuk argumen `{ data: ... }` yang benar-benar dibaca test di bawah (mock.calls). */
type MutateArgs = { data: Record<string, unknown> };

type MockPrisma = {
  project: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock<Promise<unknown>, [MutateArgs]>;
    update: jest.Mock<Promise<unknown>, [MutateArgs]>;
    delete: jest.Mock;
  };
};

function makePrismaMock(): MockPrisma {
  return {
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn<Promise<unknown>, [MutateArgs]>(),
      update: jest.fn<Promise<unknown>, [MutateArgs]>(),
      delete: jest.fn(),
    },
  };
}

const BASE_PROJECT = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  name: 'Proyek A',
  clientId: null,
  location: 'Surabaya',
  contractType: 'one_time' as const,
  status: 'Aktif' as const,
  progress: 0 as unknown,
  contractValue: 500_000_000n,
  startDate: new Date('2026-01-01'),
  endDate: null,
  description: null,
  ppnEnabled: false,
  ppnRate: 11 as unknown,
  rabStatus: 'draft' as const,
  rabApprovedBy: null,
  rabApprovedAt: null,
  isPublished: false,
  publicTitle: null,
  publicSummary: null,
  publicCategory: null,
  publicImages: [] as string[],
  createdBy: 'bbbbbbbb-0000-4000-8000-000000000002',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('ProjectsService', () => {
  let prisma: MockPrisma;
  let service: ProjectsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ProjectsService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('memakai default page=1, perPage=25 dan membungkus bentuk {data, meta} master §3.2', async () => {
      prisma.project.findMany.mockResolvedValue([BASE_PROJECT]);
      prisma.project.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 25 }),
      );
      expect(result.meta).toEqual({ page: 1, perPage: 25, total: 1 });
      expect(result.data).toHaveLength(1);
      // contractValue (bigint di DB) dikonversi ke number di response.
      expect(result.data[0].contractValue).toBe(500_000_000);
    });

    it('menghormati page & perPage dari query', async () => {
      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      await service.findAll({ page: 3, perPage: 10 });

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('melempar NotFoundException kalau proyek tak ada', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('mengembalikan proyek yang ditemukan', async () => {
      prisma.project.findUnique.mockResolvedValue(BASE_PROJECT);
      const result = await service.findOne(BASE_PROJECT.id);
      expect(result.id).toBe(BASE_PROJECT.id);
    });
  });

  describe('create', () => {
    const dto: CreateProjectDto = {
      name: 'Proyek Baru',
      location: 'Surabaya',
      contractType: 'one_time',
      status: 'Aktif',
      startDate: '2026-01-01',
    };

    it('menyertakan createdBy dari user pemanggil, tak mengirim rab_status/is_published', async () => {
      prisma.project.create.mockResolvedValue(BASE_PROJECT);

      await service.create(dto, 'user-1');

      const call = prisma.project.create.mock.calls[0][0];
      expect(call.data.createdBy).toBe('user-1');
      expect(call.data).not.toHaveProperty('rabStatus');
      expect(call.data).not.toHaveProperty('isPublished');
    });

    it('FK client_id tak ada (Prisma P2003) → dipetakan jadi BadRequestException', async () => {
      prisma.project.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK violation', {
          code: 'P2003',
          clientVersion: '6.19.3',
        }),
      );

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('error Prisma lain tetap dilempar apa adanya (tak ikut ditelan jadi 400)', async () => {
      const other = new Error('kegagalan tak terduga');
      prisma.project.create.mockRejectedValue(other);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(other);
    });
  });

  describe('update', () => {
    it('melempar NotFoundException kalau proyek tak ada', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it('memperbarui proyek yang ada', async () => {
      prisma.project.findUnique.mockResolvedValue(BASE_PROJECT);
      prisma.project.update.mockResolvedValue({
        ...BASE_PROJECT,
        name: 'Proyek Diubah',
      });

      const result = await service.update(BASE_PROJECT.id, {
        name: 'Proyek Diubah',
      });
      expect(result.name).toBe('Proyek Diubah');
    });
  });

  describe('remove', () => {
    it('melempar NotFoundException kalau proyek tak ada', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(softDelete).not.toHaveBeenCalled();
    });

    it('soft delete lewat softDelete (FR-DEL-1)', async () => {
      prisma.project.findUnique.mockResolvedValue(BASE_PROJECT);

      await service.remove(BASE_PROJECT.id, 'user-1');
      expect(softDelete).toHaveBeenCalledWith(
        prisma,
        'project',
        BASE_PROJECT.id,
        'user-1',
      );
    });
  });

  describe('updatePublication', () => {
    it('HANYA mengirim is_published + kolom public_* ke Prisma — tak ada field internal', async () => {
      prisma.project.findUnique.mockResolvedValue(BASE_PROJECT);
      prisma.project.update.mockResolvedValue({
        ...BASE_PROJECT,
        isPublished: true,
        publicTitle: 'Judul Publik',
      });

      await service.updatePublication(BASE_PROJECT.id, {
        isPublished: true,
        publicTitle: 'Judul Publik',
      });

      const call = prisma.project.update.mock.calls[0][0];
      expect(Object.keys(call.data).sort()).toEqual(
        [
          'isPublished',
          'publicTitle',
          'publicSummary',
          'publicCategory',
          'publicImages',
        ].sort(),
      );
      expect(call.data).not.toHaveProperty('name');
      expect(call.data).not.toHaveProperty('contractValue');
      expect(call.data).not.toHaveProperty('rabStatus');
    });

    it('melempar NotFoundException kalau proyek tak ada', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(
        service.updatePublication('missing-id', { isPublished: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
