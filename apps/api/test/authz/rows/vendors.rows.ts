// acme-backend/test/authz/rows/vendors.rows.ts
//
// Baris matriks otorisasi milik WP-12 — turunan langsung master §4.8
// ("clients, vendors — CRUD: pimpinan ✅ admin ✅ staff_gudang ❌"). `access`
// menggambarkan gerbang JwtAuthGuard+RolesGuard (siapa LOLOS ke handler),
// bukan hasil bisnis akhir (lihat README.md "Matriks otorisasi (Fase 1+)").
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/vendors',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'GET',
    path: '/vendors/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'POST',
    path: '/vendors',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/vendors/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'DELETE',
    path: '/vendors/:id',
    access: allow('pimpinan'), // soft delete, FR-DEL-1
  },
];
