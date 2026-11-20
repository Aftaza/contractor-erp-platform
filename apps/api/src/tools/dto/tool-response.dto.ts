// acme-backend/src/tools/dto/tool-response.dto.ts
//
// KONTRAK RESPONSE — aturan §6 #7 (fase-1-vertikal-rab.md), berlaku
// selamanya. Kelas (bukan `interface`/`type`) supaya plugin CLI
// `@nestjs/swagger` punya wujud runtime untuk diterbitkan sebagai schema
// OpenAPI — `lib/types/api.ts` di web di-generate darinya. Field tak perlu
// `@ApiProperty()` satu per satu (plugin menurunkan dari tipe TS); enum
// tetap butuh dekorator eksplisit (`status`).
//
// Tool tak punya kolom `bigint`/`Decimal` (`quantity` adalah `Int` Prisma
// biasa) — tak ada konversi serialisasi yang perlu dicatat di sini.
import { ApiProperty } from '@nestjs/swagger';
import { ToolStatus } from '@prisma/client';

export class ToolResponseDto {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  quantity: number;
  condition: string | null;

  @ApiProperty({ enum: ToolStatus, enumName: 'ToolStatus' })
  status: ToolStatus;

  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Master §3.2 — bentuk `meta` seragam untuk semua endpoint list. */
export class ToolPaginationMetaDto {
  page: number;
  perPage: number;
  total: number;
}

/** Master §3.2 — `GET /tools`. */
export class ToolListResponseDto {
  data: ToolResponseDto[];
  meta: ToolPaginationMetaDto;
}
