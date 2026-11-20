// acme-backend/test/authz/rows/termins.rows.ts
//
// Baris matriks otorisasi milik WP-17 (fase-2-keuangan-operasional.md §4).
// Satu lapis: `@Roles('pimpinan','admin')` di TerminsController — spesifikasi
// paket ini tak menyebut aturan bergantung state. Route per-item item-scoped
// (`/termins/:id`, fase-1 §2.5).
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/projects/:id/termins',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'POST',
    path: '/projects/:id/termins',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/termins/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'DELETE',
    path: '/termins/:id',
    access: allow('pimpinan'), // soft delete, FR-DEL-1
  },
  {
    method: 'GET',
    path: '/termins/:id/payments',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'POST',
    path: '/termins/:id/payments',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/termin-payments/:id',
    access: allow('pimpinan', 'admin'),
  },
  { method: 'DELETE', path: '/termin-payments/:id', access: allow('pimpinan') },
  {
    method: 'POST',
    path: '/termin-payments/:id/restore',
    access: allow('pimpinan'),
  },
];
