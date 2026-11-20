// acme-backend/src/public/dto/public-project.dto.ts
//
// KONTRAK DIBEKUKAN — fase-3-pelaporan-publikasi.md §2.6, master §7.1/§9.4.
// TEPAT TUJUH KUNCI, tak lebih. DTO ini TAK PERNAH dipakai ulang dari
// serializer internal `projects/dto/project-response.dto.ts` — kelas
// terpisah, sengaja, supaya field internal (`contractValue`, `clientId`,
// `rabStatus`, dst.) tak punya jalur struktural untuk ikut terserialisasi ke
// internet. Satu `select *` yang lolos di service-nya (public.service.ts)
// membocorkan nilai kontrak; DTO ini adalah pagar KEDUA, bukan satu-satunya.
//
// Field TIDAK didekorasi `@ApiProperty()` satu per satu (plugin CLI
// `@nestjs/swagger` menurunkannya dari tipe TS) — kecuali enum, yang butuh
// nilai runtime (aturan worker §6 #7).
import { ApiProperty } from '@nestjs/swagger';
import { PublicCategory } from '@prisma/client';

export class PublicProjectDto {
  /** UUID acak — kunci daftar di React. TAK ADA endpoint publik per-id (§2.6). */
  id: string;

  /** <- `publicTitle`. */
  title: string;

  /** <- `publicSummary`. */
  summary: string | null;

  /** <- `publicCategory`. */
  @ApiProperty({
    enum: PublicCategory,
    enumName: 'PublicCategory',
    nullable: true,
  })
  category: PublicCategory | null;

  /** <- `publicImages`. Path relatif, mis. "/uploads/ab12….webp". */
  images: string[];

  location: string;

  /** ISO `YYYY-MM-DD`, nullable. */
  endDate: string | null;
}

/** Master §3.2 — bentuk `meta` seragam untuk semua endpoint list. */
export class PublicProjectsMetaDto {
  page: number;
  perPage: number;
  total: number;
}

/** `GET /public/projects` — master §3.2. */
export class PublicProjectsResponseDto {
  data: PublicProjectDto[];
  meta: PublicProjectsMetaDto;
}
