// acme-backend/test/authz/rows/reports.rows.ts
//
// Baris matriks otorisasi milik WP-20 (fase-3-pelaporan-publikasi.md §4).
// Satu lapis: `@Roles('pimpinan','admin')` di ReportsController.
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/reports/projects',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'GET',
    path: '/reports/finance',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'GET',
    path: '/reports/progress',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'GET',
    path: '/reports/vendors',
    access: allow('pimpinan', 'admin'),
  },
];
