// acme-backend/test/authz/rows/clients.rows.ts
//
// Baris matriks otorisasi milik WP-11 — turunan langsung master §4.8
// ("clients, vendors — CRUD: pimpinan ✅ admin ✅ staff_gudang ❌"). `access`
// menggambarkan gerbang JwtAuthGuard+RolesGuard (siapa LOLOS ke handler),
// bukan hasil bisnis akhir (lihat README.md "Matriks otorisasi (Fase 1+)").
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/clients',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'GET',
    path: '/clients/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'POST',
    path: '/clients',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/clients/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'DELETE',
    path: '/clients/:id',
    access: allow('pimpinan'), // soft delete, FR-DEL-1
  },
];
