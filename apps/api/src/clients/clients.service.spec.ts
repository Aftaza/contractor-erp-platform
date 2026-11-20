// acme-backend/src/clients/clients.service.spec.ts
//
// Unit test (Prisma mock — master §9.1) untuk ClientsService. Test yang
// butuh Postgres nyata ada di clients.db-spec.ts.
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';

jest.mock('../trash/soft-delete', () => ({ softDelete: jest.fn() }));

type MutateArgs = { data: Record<string, unknown> };

type MockPrisma = {
  client: {
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
    client: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn<Promise<unknown>, [MutateArgs]>(),
      update: jest.fn<Promise<unknown>, [MutateArgs]>(),
      delete: jest.fn(),
    },
  };
}

const BASE_CLIENT = {
  id: 'aaaaaaaa-0000-4000-8000-000000000011',
  name: 'PT Klien A',
  sector: 'Semen',
  contactName: 'Budi',
  phone: '081234567890',
  email: 'budi@klien.co.id',
  address: 'Surabaya',
  notes: null,
  createdBy: 'bbbbbbbb-0000-4000-8000-000000000002',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('ClientsService', () => {
  let prisma: MockPrisma;
  let service: ClientsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ClientsService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('memakai default page=1, perPage=25 dan membungkus bentuk {data, meta} master §3.2', async () => {
      prisma.client.findMany.mockResolvedValue([BASE_CLIENT]);
      prisma.client.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 25 }),
      );
      expect(result.meta).toEqual({ page: 1, perPage: 25, total: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('menghormati page & perPage dari query', async () => {
      prisma.client.findMany.mockResolvedValue([]);
      prisma.client.count.mockResolvedValue(0);

      await service.findAll({ page: 3, perPage: 10 });

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('melempar NotFoundException kalau klien tak ada', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('mengembalikan klien yang ditemukan', async () => {
      prisma.client.findUnique.mockResolvedValue(BASE_CLIENT);
      const result = await service.findOne(BASE_CLIENT.id);
      expect(result.id).toBe(BASE_CLIENT.id);
    });
  });

  describe('create', () => {
    const dto: CreateClientDto = { name: 'Klien Baru' };

    it('menyertakan createdBy dari user pemanggil, bukan dari body', async () => {
      prisma.client.create.mockResolvedValue(BASE_CLIENT);

      await service.create(dto, 'user-1');

      const call = prisma.client.create.mock.calls[0][0];
      expect(call.data.createdBy).toBe('user-1');
      expect(call.data.name).toBe('Klien Baru');
    });
  });

  describe('update', () => {
    it('melempar NotFoundException kalau klien tak ada', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.client.update).not.toHaveBeenCalled();
    });

    it('memperbarui klien yang ada', async () => {
      prisma.client.findUnique.mockResolvedValue(BASE_CLIENT);
      prisma.client.update.mockResolvedValue({
        ...BASE_CLIENT,
        name: 'Klien Diubah',
      });

      const result = await service.update(BASE_CLIENT.id, {
        name: 'Klien Diubah',
      });
      expect(result.name).toBe('Klien Diubah');
    });
  });

  describe('remove', () => {
    it('melempar NotFoundException kalau klien tak ada', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(softDelete).not.toHaveBeenCalled();
    });

    it('soft delete lewat softDelete (FR-DEL-1)', async () => {
      prisma.client.findUnique.mockResolvedValue(BASE_CLIENT);

      await service.remove(BASE_CLIENT.id, 'user-1');
      expect(softDelete).toHaveBeenCalledWith(
        prisma,
        'client',
        BASE_CLIENT.id,
        'user-1',
      );
    });
  });
});
