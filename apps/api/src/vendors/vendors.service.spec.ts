// acme-backend/src/vendors/vendors.service.spec.ts
//
// Unit test (Prisma mock — master §9.1) untuk VendorsService. Test yang
// butuh Postgres nyata ada di vendors.db-spec.ts.
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorsService } from './vendors.service';

jest.mock('../trash/soft-delete', () => ({ softDelete: jest.fn() }));

type MutateArgs = { data: Record<string, unknown> };

type MockPrisma = {
  vendor: {
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
    vendor: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn<Promise<unknown>, [MutateArgs]>(),
      update: jest.fn<Promise<unknown>, [MutateArgs]>(),
      delete: jest.fn(),
    },
  };
}

const BASE_VENDOR = {
  id: 'aaaaaaaa-0000-4000-8000-000000000021',
  name: 'CV Vendor A',
  category: 'Material',
  contactName: 'Siti',
  phone: '081234567891',
  email: 'siti@vendor.co.id',
  address: 'Sidoarjo',
  notes: null,
  createdBy: 'bbbbbbbb-0000-4000-8000-000000000002',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('VendorsService', () => {
  let prisma: MockPrisma;
  let service: VendorsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new VendorsService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('memakai default page=1, perPage=25 dan membungkus bentuk {data, meta} master §3.2', async () => {
      prisma.vendor.findMany.mockResolvedValue([BASE_VENDOR]);
      prisma.vendor.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(prisma.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 25 }),
      );
      expect(result.meta).toEqual({ page: 1, perPage: 25, total: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('menghormati page & perPage dari query', async () => {
      prisma.vendor.findMany.mockResolvedValue([]);
      prisma.vendor.count.mockResolvedValue(0);

      await service.findAll({ page: 3, perPage: 10 });

      expect(prisma.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('melempar NotFoundException kalau vendor tak ada', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('mengembalikan vendor yang ditemukan', async () => {
      prisma.vendor.findUnique.mockResolvedValue(BASE_VENDOR);
      const result = await service.findOne(BASE_VENDOR.id);
      expect(result.id).toBe(BASE_VENDOR.id);
    });
  });

  describe('create', () => {
    const dto: CreateVendorDto = { name: 'Vendor Baru' };

    it('menyertakan createdBy dari user pemanggil, bukan dari body', async () => {
      prisma.vendor.create.mockResolvedValue(BASE_VENDOR);

      await service.create(dto, 'user-1');

      const call = prisma.vendor.create.mock.calls[0][0];
      expect(call.data.createdBy).toBe('user-1');
      expect(call.data.name).toBe('Vendor Baru');
    });
  });

  describe('update', () => {
    it('melempar NotFoundException kalau vendor tak ada', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.vendor.update).not.toHaveBeenCalled();
    });

    it('memperbarui vendor yang ada', async () => {
      prisma.vendor.findUnique.mockResolvedValue(BASE_VENDOR);
      prisma.vendor.update.mockResolvedValue({
        ...BASE_VENDOR,
        name: 'Vendor Diubah',
      });

      const result = await service.update(BASE_VENDOR.id, {
        name: 'Vendor Diubah',
      });
      expect(result.name).toBe('Vendor Diubah');
    });
  });

  describe('remove', () => {
    it('melempar NotFoundException kalau vendor tak ada', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(softDelete).not.toHaveBeenCalled();
    });

    it('soft delete lewat softDelete (FR-DEL-1)', async () => {
      prisma.vendor.findUnique.mockResolvedValue(BASE_VENDOR);

      await service.remove(BASE_VENDOR.id, 'user-1');
      expect(softDelete).toHaveBeenCalledWith(
        prisma,
        'vendor',
        BASE_VENDOR.id,
        'user-1',
      );
    });
  });
});
