// acme-backend/src/projects/dto/project-response.dto.ts
//
// KONTRAK RESPONSE — U1 (fase-1-vertikal-rab.md §5b). Kelas ini ada SEMATA
// supaya OpenAPI punya schema untuk response `projects`; `lib/types/api.ts`
// di web di-generate darinya (master §6.2). Tanpa kelas ini plugin swagger
// hanya bisa menerbitkan `{ "type": "object" }` — tipe `ProjectResponse` di
// service adalah type alias (`Omit<Project,…>`), dan type alias TypeScript
// tak punya wujud runtime yang bisa dibaca dekorator.
//
// Field TIDAK didekorasi `@ApiProperty()` satu per satu: plugin CLI
// `@nestjs/swagger` (nest-cli.json) menurunkannya dari tipe TS. Yang tetap
// butuh dekorator hanya enum — `enum: X` perlu nilai runtime.
//
// BENTUK WIRE, BUKAN BENTUK DB. `bigint` & `Decimal` sudah jadi `number` saat
// serialisasi (src/config/app-setup.ts), jadi di sini `number` — bukan
// `bigint`/`Decimal`. Kalau serialisasi itu berubah, file ini ikut berubah.
import { ApiProperty } from '@nestjs/swagger';
import {
  ContractType,
  ProjectStatus,
  PublicCategory,
  RabStatus,
} from '@prisma/client';

export class ProjectResponseDto {
  id: string;
  name: string;
  clientId: string | null;
  /** Hanya nama — allowlist DTO (CLAUDE.md §Catatan Keamanan #4), tak ada field klien lain di sini. */
  clientName: string | null;
  /** Klien sudah dihapus — tampilkan nama berlabel "dihapus" (FR-DEL-4). */
  clientDeleted: boolean;
  location: string;

  @ApiProperty({ enum: ContractType, enumName: 'ContractType' })
  contractType: ContractType;

  @ApiProperty({ enum: ProjectStatus, enumName: 'ProjectStatus' })
  status: ProjectStatus;

  /** 0–100. Kolom cache yang DIISI TRIGGER DB, tak pernah dihitung aplikasi. */
  progress: number;

  contractValue: number | null;
  startDate: Date;
  endDate: Date | null;
  description: string | null;
  ppnEnabled: boolean;

  /** Persen, mis. `11` — bukan `0.11`. */
  ppnRate: number;

  @ApiProperty({ enum: RabStatus, enumName: 'RabStatus' })
  rabStatus: RabStatus;

  rabApprovedBy: string | null;
  rabApprovedAt: Date | null;

  isPublished: boolean;
  publicTitle: string | null;
  publicSummary: string | null;

  @ApiProperty({
    enum: PublicCategory,
    enumName: 'PublicCategory',
    nullable: true,
  })
  publicCategory: PublicCategory | null;

  publicImages: string[];

  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Master §3.2 — bentuk `meta` seragam untuk semua endpoint list. */
export class PaginationMetaDto {
  page: number;
  perPage: number;
  total: number;
}

/** Master §3.2 — `GET /projects`. */
export class ProjectListResponseDto {
  data: ProjectResponseDto[];
  meta: PaginationMetaDto;
}
