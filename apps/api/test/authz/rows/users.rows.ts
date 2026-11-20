// acme-backend/test/authz/rows/users.rows.ts
//
// Baris matriks otorisasi milik WP-10 — turunan langsung master §4.8
// ("users — CRUD, set password: pimpinan ✅ admin ❌ staff_gudang ❌").
// `access` menggambarkan gerbang JwtAuthGuard+RolesGuard (siapa LOLOS ke
// handler), bukan hasil bisnis akhir.
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/users',
    access: allow('pimpinan'),
  },
  {
    method: 'GET',
    path: '/users/:id',
    access: allow('pimpinan'),
  },
  {
    method: 'POST',
    path: '/users',
    access: allow('pimpinan'),
  },
  {
    method: 'PATCH',
    path: '/users/:id',
    access: allow('pimpinan'),
  },
  {
    method: 'DELETE',
    path: '/users/:id',
    access: allow('pimpinan'),
  },
  {
    method: 'PATCH',
    path: '/users/:id/password',
    access: allow('pimpinan'),
  },
  // FR-AUTH-5, SRS §3.2: hanya pimpinan.
  {
    method: 'PATCH',
    path: '/users/:id/unlock',
    access: allow('pimpinan'),
  },
];
