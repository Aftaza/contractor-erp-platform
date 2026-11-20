// acme-backend/test/authz/rows/projects.rows.ts
//
// Baris matriks otorisasi milik WP-13 — turunan langsung master §4.8 +
// fase-1-vertikal-rab.md §4 WP-13. `access` menggambarkan gerbang
// JwtAuthGuard+RolesGuard (siapa LOLOS ke handler), bukan hasil bisnis akhir
// (lihat README.md "Matriks otorisasi (Fase 1+)").
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/projects',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
  {
    method: 'GET',
    path: '/projects/:id',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
  {
    method: 'POST',
    path: '/projects',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/projects/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'DELETE',
    path: '/projects/:id',
    access: allow('pimpinan'),
  },
  {
    method: 'PATCH',
    path: '/projects/:id/publication',
    access: allow('pimpinan'),
  },
];
