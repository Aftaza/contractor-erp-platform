// acme-backend/src/auth/dto/auth-response.dto.ts
//
// KONTRAK RESPONSE auth — U1 (fase-1-vertikal-rab.md §5b). Cermin runtime dari
// interface `PublicUser`/`MeUser`/`AuthResult` di auth.service.ts: interface
// TypeScript hilang saat kompilasi, jadi tak bisa jadi schema OpenAPI. Kelas
// ini yang dibaca `@ApiOkResponse({ type: … })` di auth.controller.ts, dan dari
// sanalah `lib/types/api.ts` di web di-generate (master §6.2).
//
// Field tak didekorasi satu per satu — plugin CLI `@nestjs/swagger`
// (nest-cli.json) menurunkannya dari tipe TS. Enum tetap butuh dekorator
// karena `enum: X` perlu nilai runtime.
//
// TIDAK PERNAH memuat `passwordHash`, `isActive`, atau kolom internal lain.
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/** Cermin `PublicUser` (auth.service.ts) — dipakai body login & refresh. */
export class PublicUserDto {
  id: string;
  email: string;
  fullName: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;

  mustChangePassword: boolean;
}

/**
 * Body `POST /auth/login` & `POST /auth/refresh`. Token hanya di cookie
 * httpOnly, tak pernah di body (SEC-2).
 */
export class AuthResponseDto {
  user: PublicUserDto;
}

/** Cermin `MeUser` — `GET /auth/me`. `name`, bukan `fullName` (kontrak sengaja beda). */
export class MeResponseDto {
  id: string;
  name: string;
  email: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;

  mustChangePassword: boolean;
}

/** Body `POST /auth/logout` & `POST /auth/change-password`. */
export class MessageResponseDto {
  message: string;
}
