// acme-backend/test/authz/rows/auth-me.rows.ts
//
// Baris matriks otorisasi milik WP-31 — GET /auth/me (tambahan scope dari
// integrator, lihat komentar di src/auth/auth.controller.ts handler `me()`).
// Terautentikasi tanpa @Roles(): semua role melihat data dirinya sendiri;
// anonim ditolak JwtAuthGuard. Endpoint ini TIDAK dikecualikan
// MustChangePasswordAppGuard — keputusan sadar, lihat komentar controller.
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/auth/me',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
];
