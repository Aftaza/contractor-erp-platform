// acme-backend/src/users/users.service.spec.ts
//
// Unit test (Prisma mock + AuthService mock — master §9.1) untuk
// UsersService. Test yang butuh Postgres nyata ada di users.db-spec.ts.
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

type MutateArgs = { data: Record<string, unknown>; select?: unknown };

type MockPrisma = {
  user: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock<Promise<unknown>, [MutateArgs]>;
    update: jest.Mock<Promise<unknown>, [MutateArgs]>;
  };
};

function makePrismaMock(): MockPrisma {
  return {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn<Promise<unknown>, [MutateArgs]>(),
      update: jest.fn<Promise<unknown>, [MutateArgs]>(),
    },
  };
}

const BASE_USER = {
  id: 'aaaaaaaa-0000-4000-8000-000000000010',
  email: 'pimpinan@acme.local',
  fullName: 'Pimpinan Uji',
  role: Role.pimpinan,
  isActive: true,
  mustChangePassword: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('UsersService', () => {
  let prisma: MockPrisma;
  let authService: { hashPassword: jest.Mock; revokeSessions: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    prisma = makePrismaMock();
    authService = {
      hashPassword: jest.fn().mockResolvedValue('hashed:xyz'),
      revokeSessions: jest.fn(),
    };
    service = new UsersService(
      prisma as unknown as PrismaService,
      authService as unknown as AuthService,
    );
  });

  describe('findAll', () => {
    it('memakai default page=1, perPage=25, select TANPA passwordHash, bentuk {data, meta}', async () => {
      prisma.user.findMany.mockResolvedValue([BASE_USER]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({});

      const call = (prisma.user.findMany.mock.calls[0] as unknown[])[0] as {
        skip: number;
        take: number;
        select: Record<string, boolean>;
      };
      expect(call.skip).toBe(0);
      expect(call.take).toBe(25);
      expect(call.select.passwordHash).toBeUndefined();
      expect(result.meta).toEqual({ page: 1, perPage: 25, total: 1 });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('melempar NotFoundException kalau user tak ada', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('mengembalikan user yang ditemukan', async () => {
      prisma.user.findUnique.mockResolvedValue(BASE_USER);
      const result = await service.findOne(BASE_USER.id);
      expect(result.id).toBe(BASE_USER.id);
    });
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      email: 'baru@acme.local',
      password: 'PasswordPanjang-123',
      fullName: 'User Baru',
      role: Role.staff_gudang,
    };

    it('meng-hash password lewat AuthService.hashPassword, BUKAN argon2 langsung', async () => {
      prisma.user.create.mockResolvedValue({
        ...BASE_USER,
        email: dto.email,
        role: dto.role,
      });

      await service.create(dto);

      expect(authService.hashPassword).toHaveBeenCalledWith(dto.password);
      const call = prisma.user.create.mock.calls[0][0];
      expect(call.data.passwordHash).toBe('hashed:xyz');
      expect(call.data).not.toHaveProperty('password');
      // select eksplisit TANPA passwordHash — hash tak pernah keluar dari query.
      const select = call.select as Record<string, boolean>;
      expect(select.passwordHash).toBeUndefined();
    });
  });

  describe('update', () => {
    it('melempar NotFoundException kalau user tak ada', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing-id', { fullName: 'X' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('memperbarui user yang ada', async () => {
      prisma.user.findUnique.mockResolvedValue(BASE_USER);
      prisma.user.update.mockResolvedValue({
        ...BASE_USER,
        fullName: 'Nama Baru',
      });

      const result = await service.update(BASE_USER.id, {
        fullName: 'Nama Baru',
      });
      expect(result.fullName).toBe('Nama Baru');
    });
  });

  describe('setPassword', () => {
    it('melempar NotFoundException kalau user tak ada', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.setPassword('missing-id', { newPassword: 'PasswordBaru-123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('meng-hash password baru lewat AuthService & men-set mustChangePassword=true', async () => {
      prisma.user.findUnique.mockResolvedValue(BASE_USER);
      prisma.user.update.mockResolvedValue({
        ...BASE_USER,
        mustChangePassword: true,
      });

      await service.setPassword(BASE_USER.id, {
        newPassword: 'PasswordBaru-123',
      });

      expect(authService.hashPassword).toHaveBeenCalledWith('PasswordBaru-123');
      const call = prisma.user.update.mock.calls[0][0];
      expect(call.data.passwordHash).toBe('hashed:xyz');
      expect(call.data.mustChangePassword).toBe(true);
    });
  });

  describe('remove', () => {
    it('melempar NotFoundException kalau user tak ada', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('soft-delete: update isActive=false, BUKAN delete baris', async () => {
      prisma.user.findUnique.mockResolvedValue(BASE_USER);
      prisma.user.update.mockResolvedValue({ ...BASE_USER, isActive: false });

      await service.remove(BASE_USER.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: BASE_USER.id },
        data: { isActive: false },
      });
    });
  });
});
