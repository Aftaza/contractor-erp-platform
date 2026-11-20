// acme-backend/test/authz/rows/public.rows.ts
//
// Baris matriks otorisasi milik WP-21 — turunan langsung master §4.8
// (`GET /public/projects` ✅ semua termasuk anonim) +
// fase-3-pelaporan-publikasi.md §2.6/§4 WP-21.
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/public/projects',
    access: allow('pimpinan', 'admin', 'staff_gudang', 'anonim'),
  },
];
