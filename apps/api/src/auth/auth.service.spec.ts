// acme-backend/src/auth/auth.service.spec.ts
//
// Unit test — Prisma/Jwt/Config di-mock (tanpa DB nyata, jalan tanpa .env
// lewat test/setup-env.ts). Alur yang butuh Postgres sungguhan (rotasi
// refresh, is_active, brute force, redaksi log) ada di auth.flow.db-spec.ts.
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

interface CreateRefreshTokenArgs {
  data: { userId: string; tokenHash: string; expiresAt: Date };
}

interface MockPrismaService {
  user: { findUnique: jest.Mock; update: jest.Mock };
  refreshToken: {
    create: jest.Mock<unknown, [CreateRefreshTokenArgs]>;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
}

interface MockJwtService {
  signAsync: jest.Mock;
  verifyAsync: jest.Mock;
}

interface MockConfigService {
  getOrThrow: jest.Mock;
}

describe('AuthService (unit)', () => {
  let prisma: MockPrismaService;
  let jwt: MockJwtService;
  let config: MockConfigService;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ failedLoginCount: 1 }),
      },
      refreshToken: {
        create: jest.fn<unknown, [CreateRefreshTokenArgs]>(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    };
    jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    config = {
      getOrThrow: jest.fn((key: string) =>
        key === 'JWT_ACCESS_SECRET' ? 'access-secret' : 'refresh-secret',
      ),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  describe('login', () => {
    it('menolak email tak terdaftar dengan pesan generik', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@acme.local', password: 'apapun' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('pesan error SAMA antara "email tak terdaftar" dan "password salah" (anti-enumerasi)', async () => {
      const hash = await argon2.hash('password-benar', {
        type: argon2.argon2id,
      });

      prisma.user.findUnique.mockResolvedValueOnce(null);
      const notFound = await service
        .login({ email: 'nope@acme.local', password: 'x' })
        .catch((e: Error) => e);

      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'x@acme.local',
        passwordHash: hash,
        isActive: true,
        role: 'staff_gudang',
        fullName: 'X',
        mustChangePassword: false,
      });
      const wrongPassword = await service
        .login({ email: 'x@acme.local', password: 'salah' })
        .catch((e: Error) => e);

      expect((notFound as Error).message).toBe(
        (wrongPassword as Error).message,
      );
    });

    it('FR-AUTH-5: gagal ke-5 mengunci akun; akun terkunci ditolak walau password benar, tanpa menambah hitungan', async () => {
      const hash = await argon2.hash('password-benar', {
        type: argon2.argon2id,
      });
      const base = {
        id: 'u1',
        email: 'x@acme.local',
        passwordHash: hash,
        isActive: true,
        role: 'staff_gudang',
        fullName: 'X',
        mustChangePassword: false,
        failedLoginCount: 4,
        lockedUntil: null,
      };

      prisma.user.findUnique.mockResolvedValueOnce(base);
      prisma.user.update.mockResolvedValueOnce({ failedLoginCount: 5 });
      await expect(
        service.login({ email: base.email, password: 'salah' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenLastCalledWith({
        where: { id: 'u1' },
        data: { failedLoginCount: 0, lockedUntil: expect.any(Date) as Date },
      });

      prisma.user.update.mockClear();
      prisma.user.findUnique.mockResolvedValueOnce({
        ...base,
        failedLoginCount: 0,
        lockedUntil: new Date(Date.now() + 60_000),
      });
      await expect(
        service.login({ email: base.email, password: 'password-benar' }),
      ).rejects.toThrow('Email atau password salah');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('menolak user is_active=false walau password benar', async () => {
      const hash = await argon2.hash('password-benar', {
        type: argon2.argon2id,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'x@acme.local',
        passwordHash: hash,
        isActive: false,
        role: 'staff_gudang',
        fullName: 'X',
        mustChangePassword: false,
      });
      await expect(
        service.login({ email: 'x@acme.local', password: 'password-benar' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('login sukses menerbitkan token & menyimpan HASH refresh token (bukan plaintext) ke DB', async () => {
      const hash = await argon2.hash('password-benar', {
        type: argon2.argon2id,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'x@acme.local',
        passwordHash: hash,
        isActive: true,
        role: 'admin',
        fullName: 'X',
        mustChangePassword: true,
      });
      jwt.signAsync
        .mockResolvedValueOnce('access.jwt.token')
        .mockResolvedValueOnce('refresh.jwt.token');

      const result = await service.login({
        email: 'x@acme.local',
        password: 'password-benar',
      });

      expect(result.accessToken).toBe('access.jwt.token');
      expect(result.refreshToken).toBe('refresh.jwt.token');
      expect(result.user).toMatchObject({
        id: 'u1',
        role: 'admin',
        mustChangePassword: true,
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const createArg = prisma.refreshToken.create.mock.calls[0][0];
      expect(createArg.data.userId).toBe('u1');
      expect(createArg.data.tokenHash).not.toBe('refresh.jwt.token');
      expect(typeof createArg.data.tokenHash).toBe('string');
    });
  });

  describe('refresh', () => {
    it('menolak token dengan signature tak valid', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
      await expect(service.refresh('token-rusak')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('menolak refresh token yang sudah dicabut (mencegah reuse setelah rotasi)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: new Date(),
      });
      await expect(service.refresh('token-lama')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('menolak refresh token yang sudah kedaluwarsa', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      });
      await expect(service.refresh('token-expired')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('menolak kalau baris token tak ditemukan sama sekali di DB', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refresh('token-asing')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('refresh sukses: mencabut baris lama SEBELUM menerbitkan pasangan token baru', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'x@acme.local',
        isActive: true,
        role: 'pimpinan',
        fullName: 'X',
        mustChangePassword: false,
        passwordHash: 'irrelevant',
      });
      jwt.signAsync
        .mockResolvedValueOnce('access2')
        .mockResolvedValueOnce('refresh2');

      const result = await service.refresh('token-lama-valid');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(result.accessToken).toBe('access2');
      expect(result.refreshToken).toBe('refresh2');
    });

    it('menolak kalau user pemilik token sudah is_active=false', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isActive: false,
        role: 'admin',
      });
      await expect(service.refresh('token-valid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('menolak password lama yang salah', async () => {
      const hash = await argon2.hash('password-lama', {
        type: argon2.argon2id,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: hash,
      });
      await expect(
        service.changePassword('u1', {
          oldPassword: 'salah',
          newPassword: 'password-baru-123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak password baru yang identik dengan password lama', async () => {
      const hash = await argon2.hash('password-sama-persis', {
        type: argon2.argon2id,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: hash,
      });
      await expect(
        service.changePassword('u1', {
          oldPassword: 'password-sama-persis',
          newPassword: 'password-sama-persis',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sukses: update password + cabut semua refresh token', async () => {
      // BUKAN prisma.$transaction([...]) array — lihat komentar di
      // auth.service.ts: `User` teraudit (src/audit/audit.extension.ts,
      // WP-05), dan array `$transaction` bentrok dengan cara ekstensi itu
      // mencegat mutasi model teraudit (terbukti menggantung tanpa batas di
      // Postgres nyata, direproduksi di db-spec). Dua panggilan berurutan
      // adalah perbaikannya — dibuktikan di sini lewat urutan pemanggilan
      // mock, bukan lewat jumlah panggilan $transaction.
      const hash = await argon2.hash('password-lama-valid', {
        type: argon2.argon2id,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: hash,
      });

      await service.changePassword('u1', {
        oldPassword: 'password-lama-valid',
        newPassword: 'password-baru-yang-panjang',
      });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          passwordHash: expect.any(String) as string,
          mustChangePassword: false,
        },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });
  });

  describe('logout', () => {
    it('tak melempar error kalau tak ada token disodorkan (idempotent)', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('tak melempar error kalau token sudah tak valid (logout tetap dianggap berhasil)', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('expired'));
      await expect(service.logout('token-rusak')).resolves.toBeUndefined();
    });

    it('mencabut baris refresh token milik user yang sesuai', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti-1' });
      await service.logout('token-valid');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          tokenHash: expect.any(String) as string,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });
  });
});
