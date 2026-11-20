// acme-backend/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

/** 3 role global — master plan §0.2. Tak ada role per-proyek. */
export type AppRole = 'pimpinan' | 'admin' | 'staff_gudang';

export const ROLES_KEY = 'roles';

/** Batasi route ke role tertentu. Dicek RolesGuard; aturan yang lebih rumit tinggal di policy service (WP-04). */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
