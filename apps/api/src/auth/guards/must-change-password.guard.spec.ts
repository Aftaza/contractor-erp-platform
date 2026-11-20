// acme-backend/src/auth/guards/must-change-password.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MustChangePasswordGuard } from './must-change-password.guard';

function makeContext(user?: { mustChangePassword: boolean }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('MustChangePasswordGuard (unit)', () => {
  const guard = new MustChangePasswordGuard();

  it('menolak (403 ForbiddenException) saat user.mustChangePassword true', () => {
    expect(() =>
      guard.canActivate(makeContext({ mustChangePassword: true })),
    ).toThrow(ForbiddenException);
  });

  it('mengizinkan saat user.mustChangePassword false', () => {
    expect(guard.canActivate(makeContext({ mustChangePassword: false }))).toBe(
      true,
    );
  });

  it('mengizinkan saat request.user tak ada (bukan tanggung jawab guard ini — JwtAuthGuard yang menolak lebih dulu)', () => {
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });
});
