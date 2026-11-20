// acme-backend/src/common/guards/roles.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function createContext(user?: { role: string }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (kerangka)', () => {
  it('meloloskan bila route tak butuh role spesifik', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext({ role: 'staff_gudang' }))).toBe(
      true,
    );
  });

  it('meloloskan bila role user cocok', () => {
    const reflector = {
      getAllAndOverride: () => ['pimpinan', 'admin'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext({ role: 'admin' }))).toBe(true);
  });

  it('menolak bila role user tak cocok', () => {
    const reflector = {
      getAllAndOverride: () => ['pimpinan'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(createContext({ role: 'staff_gudang' })),
    ).toThrow(ForbiddenException);
  });

  it('menolak bila request tak punya user (belum lewat JwtAuthGuard)', () => {
    const reflector = {
      getAllAndOverride: () => ['admin'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
