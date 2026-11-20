// acme-backend/src/common/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole, ROLES_KEY } from '../decorators/roles.decorator';

interface RequestWithUser {
  user?: { role: string };
}

/**
 * Kerangka guard role (RolesGuard). Mengasumsikan JwtAuthGuard sudah jalan
 * lebih dulu dan menempel `request.user`. Ini hanya pembanding metadata
 * `@Roles()` vs role di request — aturan yang lebih rumit (mis. "admin tak
 * boleh edit RAB approved") tinggal di policy service terpusat (WP-04),
 * BUKAN di sini dan BUKAN tersebar di controller (master §5.2).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const role = request.user?.role;
    if (!role || !requiredRoles.includes(role as AppRole)) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk aksi ini');
    }
    return true;
  }
}
