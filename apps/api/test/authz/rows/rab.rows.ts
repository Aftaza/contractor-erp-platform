// acme-backend/test/authz/rows/rab.rows.ts
//
// Baris matriks otorisasi milik WP-14 — turunan langsung master §4.8 +
// fase-1-vertikal-rab.md §4 WP-14. `access` menggambarkan gerbang
// JwtAuthGuard+RolesGuard (siapa LOLOS ke handler), BUKAN hasil bisnis
// akhir. Endpoint mutasi node (`create/update/delete`) tetap
// `allow('pimpinan','admin')` walau admin bisa ditolak 403 belakangan oleh
// `PolicyService.canMutateRabNode` saat `rab_status='approved'` — itu
// sengaja TAK tercermin di sini (lihat README.md "Matriks otorisasi (Fase
// 1+)" § "Yang PENTING dipahami"; fase-0-fondasi.md pelajaran #5).
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/projects/:id/rab/nodes',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'POST',
    path: '/projects/:id/rab/nodes',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/rab/nodes/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'DELETE',
    path: '/rab/nodes/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/rab/nodes/:id/progress',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'POST',
    path: '/projects/:id/rab/approve',
    access: allow('pimpinan'),
  },
  {
    method: 'GET',
    path: '/projects/:id/rab/summary',
    access: allow('pimpinan', 'admin'),
  },
];
