// acme-backend/src/project-tools/dto/approve-project-tool.dto.ts
import { ProjectToolApprovalStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

/**
 * `PATCH /project-tools/:id/approve` — pimpinan saja (matriks master §4.8:
 * "project_tools — approve/reject" = pimpinan ✅, siapa pun lain ❌). Hanya
 * dua nilai sah di endpoint ini; `pending` bukan hasil approve/reject yang
 * valid untuk dikirim balik.
 */
export class ApproveProjectToolDto {
  @IsIn([
    ProjectToolApprovalStatus.approved,
    ProjectToolApprovalStatus.rejected,
  ])
  approvalStatus!:
    | typeof ProjectToolApprovalStatus.approved
    | typeof ProjectToolApprovalStatus.rejected;
}
