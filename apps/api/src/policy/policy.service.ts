// acme-backend/src/policy/policy.service.ts
//
// Policy service terpusat — WP-04 (master §5.2, §9.1; fase-0-fondasi.md
// §WP-04). Satu-satunya tempat untuk aturan otorisasi master §4.8 yang TAK
// muat di dekorator `@Roles()` karena bergantung pada STATE data, bukan
// cuma role si pemanggil. Dua baris matriks yang perlu ini:
//
//   - rab_nodes create/update/delete: admin hanya boleh saat rab_status
//     masih 'draft' (master §4.8: "admin — hanya rab_status='draft'").
//   - project_tools create/update: staff_gudang hanya boleh atas miliknya
//     sendiri & masih 'pending' (master §4.8: "staff_gudang (miliknya,
//     pending)").
//
// Baris matriks lain di §4.8 murni role-check (mis. "clients — pimpinan+
// admin") — itu cukup `@Roles(...)` + `RolesGuard` (common/guards), TAK
// perlu method di sini. Dilarang menyebar `if (role === ...)` di controller
// untuk kasus SEPERTI DUA DI ATAS — controller Fase 1+ (rab, project-tools)
// wajib memanggil method di sini, bukan menulis ulang logikanya.
//
// Coverage wajib 100% cabang (master §9.7) — lihat policy.service.spec.ts.
import { Injectable } from '@nestjs/common';
import { ProjectToolApprovalStatus, RabStatus } from '@prisma/client';
import { AppRole } from '../common/decorators/roles.decorator';

export interface ProjectToolMutationSubject {
  /** `project_tools.recorded_by` — pemilik baris (master §4.6). */
  recordedByUserId: string;
  approvalStatus: ProjectToolApprovalStatus;
}

@Injectable()
export class PolicyService {
  /**
   * rab_nodes — create/update/delete (master §4.8).
   * pimpinan: selalu boleh.
   * admin: hanya selama `rab_status='draft'` — sekali pimpinan approve,
   *   pohon RAB terkunci dari admin (master §0.2 "Lifecycle RAB").
   * staff_gudang: tak pernah (tak sampai ke sini secara normal — RolesGuard
   *   sudah menolak lebih dulu karena endpoint ini didekorasi
   *   `@Roles('pimpinan','admin')` — tapi dicek eksplisit di sini juga,
   *   supaya policy service tetap sumber kebenaran tunggal, bukan bergantung
   *   diam-diam pada urutan guard di controller).
   */
  canMutateRabNode(role: AppRole, rabStatus: RabStatus): boolean {
    if (role === 'pimpinan') return true;
    if (role === 'admin') return rabStatus === RabStatus.draft;
    return false;
  }

  /**
   * project_tools — create/update (master §4.8).
   * pimpinan: selalu boleh.
   * staff_gudang: hanya baris miliknya sendiri (`recorded_by` = dirinya)
   *   DAN masih `approval_status='pending'` — begitu pimpinan approve/reject,
   *   baris terkunci dari staff_gudang juga.
   * admin: tak pernah (finance/RAB & alat gudang terpisah wewenang).
   */
  canMutateProjectTool(
    role: AppRole,
    requestingUserId: string,
    subject: ProjectToolMutationSubject,
  ): boolean {
    if (role === 'pimpinan') return true;
    if (role === 'staff_gudang') {
      return (
        subject.recordedByUserId === requestingUserId &&
        subject.approvalStatus === ProjectToolApprovalStatus.pending
      );
    }
    return false;
  }
}
