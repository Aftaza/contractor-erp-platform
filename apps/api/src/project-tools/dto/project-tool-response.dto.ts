// acme-backend/src/project-tools/dto/project-tool-response.dto.ts
//
// KONTRAK RESPONSE — aturan §6 #7. Kelas (bukan interface/type) supaya
// plugin CLI `@nestjs/swagger` punya wujud runtime untuk schema OpenAPI.
// `ProjectTool` tak punya kolom `bigint`/`Decimal` (`quantity` adalah `Int`
// Prisma biasa) — tak ada konversi serialisasi untuk dicatat.
import { ApiProperty } from '@nestjs/swagger';
import { ProjectToolApprovalStatus } from '@prisma/client';

export class ProjectToolResponseDto {
  id: string;
  projectId: string;
  toolId: string;
  quantity: number;
  usedFrom: Date | null;
  usedTo: Date | null;

  @ApiProperty({
    enum: ProjectToolApprovalStatus,
    enumName: 'ProjectToolApprovalStatus',
  })
  approvalStatus: ProjectToolApprovalStatus;

  approvedBy: string | null;
  approvedAt: Date | null;
  recordedBy: string | null;
  notes: string | null;
  createdAt: Date;
}

/** Master §3.2 — bentuk `meta` seragam untuk semua endpoint list. */
export class ProjectToolPaginationMetaDto {
  page: number;
  perPage: number;
  total: number;
}

/** Master §3.2 — `GET /projects/:id/project-tools`. */
export class ProjectToolListResponseDto {
  data: ProjectToolResponseDto[];
  meta: ProjectToolPaginationMetaDto;
}
