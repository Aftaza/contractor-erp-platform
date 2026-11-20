// acme-backend/test/authz/rows/project-tools.rows.ts
//
// Baris matriks otorisasi milik WP-18 — turunan langsung master §4.8
// (fase-2-keuangan-operasional.md §4 WP-18). `access` menggambarkan gerbang
// JwtAuthGuard+RolesGuard (siapa LOLOS ke handler), BUKAN hasil bisnis
// akhir. `POST`/`PATCH` tetap `allow('pimpinan','staff_gudang')` walau
// staff_gudang bisa ditolak 403 belakangan oleh
// `PolicyService.canMutateProjectTool` saat baris bukan miliknya atau sudah
// non-`pending` — itu sengaja TAK tercermin di sini (pola sama seperti
// `rab.rows.ts` WP-14, fase-0 pelajaran #5).
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/projects/:id/project-tools',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
  {
    method: 'POST',
    path: '/projects/:id/project-tools',
    access: allow('pimpinan', 'staff_gudang'),
  },
  {
    method: 'PATCH',
    path: '/project-tools/:id',
    access: allow('pimpinan', 'staff_gudang'),
  },
  {
    method: 'PATCH',
    path: '/project-tools/:id/approve',
    access: allow('pimpinan'),
  },
];
