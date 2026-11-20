// acme-backend/test/authz/rows/notifications.rows.ts
//
// Baris matriks otorisasi milik WP-19 — turunan langsung master §4.8
// ("notifications — miliknya": pimpinan/admin/staff_gudang semua lolos
// GERBANG role). Scoping "miliknya" TAK tercermin di sini (itu logika
// service, master §4.8 baris "notifications — miliknya" bukan
// role-check) — `access` menggambarkan JwtAuthGuard+RolesGuard, bukan
// hasil bisnis akhir.
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/notifications',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
  {
    method: 'PATCH',
    path: '/notifications/:id/read',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
];
