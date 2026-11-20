// acme-backend/src/auth/auth-verifier.service.spec.ts
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthVerifierService } from './auth-verifier.service';
import { PrismaService } from '../prisma/prisma.service';

interface MockJwtService {
  verifyAsync: jest.Mock;
}

interface MockConfigService {
  getOrThrow: jest.Mock;
}

interface MockPrismaService {
  user: { findUnique: jest.Mock };
}

describe('AuthVerifierService (unit)', () => {
  let jwt: MockJwtService;
  let config: MockConfigService;
  let prisma: MockPrismaService;
  let verifier: AuthVerifierService;

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    config = { getOrThrow: jest.fn().mockReturnValue('access-secret') };
    prisma = { user: { findUnique: jest.fn() } };
    verifier = new AuthVerifierService(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  it('null kalau signature/kedaluwarsa JWT tak valid', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    expect(await verifier.verify('token-rusak')).toBeNull();
  });

  it('null kalau user tak ditemukan di DB (mis. sudah dihapus)', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'ghost' });
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await verifier.verify('token')).toBeNull();
  });

  it('null kalau user is_active=false — DICEK ULANG KE DB, bukan dari klaim JWT', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'admin',
      isActive: false,
      mustChangePassword: false,
    });
    expect(await verifier.verify('token')).toBeNull();
  });

  it('mengembalikan {id, role, mustChangePassword} kalau token valid & user aktif', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'pimpinan',
      isActive: true,
      mustChangePassword: true,
    });
    expect(await verifier.verify('token')).toEqual({
      id: 'u1',
      role: 'pimpinan',
      mustChangePassword: true,
    });
  });
});
