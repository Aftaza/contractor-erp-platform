// acme-backend/test/authz/rows/expenses.rows.ts
//
// Baris matriks otorisasi milik WP-17 (fase-2-keuangan-operasional.md §4).
// Satu lapis: `@Roles('pimpinan','admin')` di ExpensesController. Termasuk
// `GET /projects/:id/finance/summary` — endpoint ringkasan keuangan yang
// duduk di modul ini (fase-2 §2.2).
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/projects/:id/expenses',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'POST',
    path: '/projects/:id/expenses',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/expenses/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'DELETE',
    path: '/expenses/:id',
    access: allow('pimpinan'), // soft delete, FR-DEL-1
  },
  {
    method: 'GET',
    path: '/projects/:id/finance/summary',
    access: allow('pimpinan', 'admin'),
  },
];
