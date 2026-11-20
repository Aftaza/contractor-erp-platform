// acme-backend/src/reports/dto/report-project-response.dto.ts
//
// KONTRAK RESPONSE `GET /reports/projects` — fase-3-pelaporan-publikasi.md
// §4 WP-20. `class`, bukan `interface`/`type` (fase-1 §6 #7). `realisasiBiaya`
// & `profit` DIHITUNG backend lewat `calculateFinanceSummary`
// (`expenses/finance-summary.util.ts`, §2.3) — tak pernah di frontend.
import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';

export class ReportProjectRowDto {
  projectId: string;
  name: string;
  clientName: string | null;
  /** Klien sudah dihapus — nama berlabel "dihapus" (FR-DEL-4). */
  clientDeleted: boolean;

  @ApiProperty({ enum: ProjectStatus, enumName: 'ProjectStatus' })
  status: ProjectStatus;

  contractValue: number | null;
  paidTotal: number;
  realisasiBiaya: number;
  profit: number;
}

/** Master §3.2 — `GET /reports/projects`. */
export class ReportProjectListResponseDto {
  data: ReportProjectRowDto[];
  meta: PaginationMetaDto;
}
