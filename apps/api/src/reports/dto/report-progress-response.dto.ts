// acme-backend/src/reports/dto/report-progress-response.dto.ts
//
// KONTRAK RESPONSE `GET /reports/progress` — fase-3-pelaporan-publikasi.md
// §4 WP-20. `progress` dibaca langsung dari kolom cache `projects.progress`
// (diisi trigger DB, master §4.4) — tak dihitung ulang di sini.
import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';

export class ReportProgressRowDto {
  projectId: string;
  name: string;

  @ApiProperty({ enum: ProjectStatus, enumName: 'ProjectStatus' })
  status: ProjectStatus;

  /** 0–100. */
  progress: number;

  contractValue: number | null;
}

/** Master §3.2 — `GET /reports/progress`. */
export class ReportProgressListResponseDto {
  data: ReportProgressRowDto[];
  meta: PaginationMetaDto;
}
