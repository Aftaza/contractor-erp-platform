// acme-backend/src/policy/guards/must-change-password-app.guard.spec.ts
import { ExecutionContext } from '@nestjs/common';
import { AuthController } from '../../auth/auth.controller';
import { MustChangePasswordAppGuard } from './must-change-password-app.guard';

function makeContext(
  handler: (...args: unknown[]) => unknown,
  user?: { mustChangePassword: boolean },
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

describe('MustChangePasswordAppGuard (unit)', () => {
  const guard = new MustChangePasswordAppGuard();

  // Referensi method di kedua test ini dipakai hanya sebagai identitas
  // objek (lihat catatan sama di must-change-password-app.guard.ts), tak
  // pernah dipanggil — aman diabaikan dari unbound-method.
  it('mengecualikan AuthController.changePassword tanpa mengecek user sama sekali', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const handler = AuthController.prototype.changePassword;
    expect(
      guard.canActivate(makeContext(handler, { mustChangePassword: true })),
    ).toBe(true);
  });

  it('mengecualikan AuthController.logout tanpa mengecek user sama sekali', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const handler = AuthController.prototype.logout;
    expect(
      guard.canActivate(makeContext(handler, { mustChangePassword: true })),
    ).toBe(true);
  });

  it('route lain: mendelegasikan ke MustChangePasswordGuard — menolak saat mustChangePassword true', () => {
    const otherHandler = () => undefined;
    expect(() =>
      guard.canActivate(
        makeContext(otherHandler, { mustChangePassword: true }),
      ),
    ).toThrow('Password wajib diganti sebelum melanjutkan');
  });

  it('route lain: mendelegasikan ke MustChangePasswordGuard — mengizinkan saat mustChangePassword false', () => {
    const otherHandler = () => undefined;
    expect(
      guard.canActivate(
        makeContext(otherHandler, { mustChangePassword: false }),
      ),
    ).toBe(true);
  });
});
