// acme-backend/test/authz/rows/uploads.rows.ts
//
// Baris matriks otorisasi milik WP-21 — fase-3-pelaporan-publikasi.md §2.7,
// §4 WP-21. `POST /uploads` pimpinan-only (sejajar hak `is_published` +
// `public_*`, master §4.8); `GET /uploads/:filename` publik (foto portfolio
// dikonsumsi situs anonim).
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'POST',
    path: '/uploads',
    access: allow('pimpinan'),
  },
  {
    method: 'GET',
    path: '/uploads/:filename',
    access: allow('pimpinan', 'admin', 'staff_gudang', 'anonim'),
  },
];
