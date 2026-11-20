// acme-backend/src/common/guards/jwt-auth.guard.spec.ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthVerifier, JwtAuthGuard } from './jwt-auth.guard';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard (kerangka)', () => {
  it('meloloskan route yang ditandai @Public()', async () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);

    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).resolves.toBe(true);
  });

  it('fail-closed: menolak request non-publik saat verifier belum terpasang', async () => {
    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const ctx = createContext({ headers: { authorization: 'Bearer abc' } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('menolak request non-publik tanpa token', async () => {
    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const ctx = createContext({ headers: {} });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('meloloskan & menempel request.user saat verifier mengembalikan user valid', async () => {
    const reflector = {
      getAllAndOverride: () => false,
    } as unknown as Reflector;
    const verifier: AuthVerifier = {
      verify: jest.fn().mockResolvedValue({ id: 'u1', role: 'admin' }),
    };
    const guard = new JwtAuthGuard(reflector, verifier);
    const request = { headers: { authorization: 'Bearer abc' } };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect((request as { user?: unknown }).user).toEqual({
      id: 'u1',
      role: 'admin',
    });
  });
});
