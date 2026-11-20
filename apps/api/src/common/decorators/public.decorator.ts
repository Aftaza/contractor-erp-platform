// acme-backend/src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Tandai route bebas auth (mis. `/health`, `/public/*`). Dibaca JwtAuthGuard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
