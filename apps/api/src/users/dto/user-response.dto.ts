// acme-backend/src/users/dto/user-response.dto.ts
//
// KONTRAK RESPONSE — aturan worker §6 #7. Kelas, bukan interface/type alias.
// SENGAJA TIDAK PUNYA field `passwordHash` — ini bukan cuma soal skema DTO,
// UsersService (lihat USER_SELECT) juga tak pernah men-query kolom itu dari
// Postgres, jadi hash tak pernah ada di memori objek yang diserialisasi
// (fase-2 §4 WP-10: "passwordHash TAK PERNAH muncul di DTO response").
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  fullName: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;

  isActive: boolean;
  mustChangePassword: boolean;
  /** FR-AUTH-5: terisi & di masa depan = akun sedang terkunci (tandai di daftar user). */
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Master §3.2 — bentuk `meta` seragam. */
export class UserPaginationMetaDto {
  page: number;
  perPage: number;
  total: number;
}

/** Master §3.2 — `GET /users`. */
export class UserListResponseDto {
  data: UserResponseDto[];
  meta: UserPaginationMetaDto;
}
