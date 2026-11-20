// acme-backend/src/policy/policy.service.spec.ts
//
// 100% cabang wajib (master §9.7) — PolicyService adalah satu-satunya
// penjaga untuk dua baris matriks §4.8 yang bergantung state, jadi tiap
// cabang if/return di sana harus punya test eksplisit, bukan cuma tiap
// method dipanggil sekali.
import { ProjectToolApprovalStatus, RabStatus } from '@prisma/client';
import { PolicyService } from './policy.service';

describe('PolicyService (unit)', () => {
  const policy = new PolicyService();

  describe('canMutateRabNode — rab_nodes create/update/delete (master §4.8)', () => {
    it('pimpinan selalu boleh, draft', () => {
      expect(policy.canMutateRabNode('pimpinan', RabStatus.draft)).toBe(true);
    });

    it('pimpinan selalu boleh, approved', () => {
      expect(policy.canMutateRabNode('pimpinan', RabStatus.approved)).toBe(
        true,
      );
    });

    it('admin boleh saat rab_status draft', () => {
      expect(policy.canMutateRabNode('admin', RabStatus.draft)).toBe(true);
    });

    it('admin DITOLAK saat rab_status approved', () => {
      expect(policy.canMutateRabNode('admin', RabStatus.approved)).toBe(false);
    });

    it('staff_gudang tak pernah boleh, draft sekalipun', () => {
      expect(policy.canMutateRabNode('staff_gudang', RabStatus.draft)).toBe(
        false,
      );
    });
  });

  describe('canMutateProjectTool — project_tools create/update (master §4.8)', () => {
    const requestingUserId = 'user-staff-1';

    it('pimpinan selalu boleh, apa pun pemilik/status', () => {
      expect(
        policy.canMutateProjectTool('pimpinan', requestingUserId, {
          recordedByUserId: 'user-lain',
          approvalStatus: ProjectToolApprovalStatus.approved,
        }),
      ).toBe(true);
    });

    it('staff_gudang boleh atas miliknya sendiri & masih pending', () => {
      expect(
        policy.canMutateProjectTool('staff_gudang', requestingUserId, {
          recordedByUserId: requestingUserId,
          approvalStatus: ProjectToolApprovalStatus.pending,
        }),
      ).toBe(true);
    });

    it('staff_gudang DITOLAK atas milik orang lain, meski masih pending', () => {
      expect(
        policy.canMutateProjectTool('staff_gudang', requestingUserId, {
          recordedByUserId: 'user-lain',
          approvalStatus: ProjectToolApprovalStatus.pending,
        }),
      ).toBe(false);
    });

    it('staff_gudang DITOLAK atas miliknya sendiri tapi sudah approved', () => {
      expect(
        policy.canMutateProjectTool('staff_gudang', requestingUserId, {
          recordedByUserId: requestingUserId,
          approvalStatus: ProjectToolApprovalStatus.approved,
        }),
      ).toBe(false);
    });

    it('staff_gudang DITOLAK atas miliknya sendiri tapi sudah rejected', () => {
      expect(
        policy.canMutateProjectTool('staff_gudang', requestingUserId, {
          recordedByUserId: requestingUserId,
          approvalStatus: ProjectToolApprovalStatus.rejected,
        }),
      ).toBe(false);
    });

    it('admin tak pernah boleh, meski pemilik & pending', () => {
      expect(
        policy.canMutateProjectTool('admin', requestingUserId, {
          recordedByUserId: requestingUserId,
          approvalStatus: ProjectToolApprovalStatus.pending,
        }),
      ).toBe(false);
    });
  });
});
