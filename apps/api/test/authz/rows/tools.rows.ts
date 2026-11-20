// acme-backend/test/authz/rows/tools.rows.ts
//
// Baris matriks otorisasi milik WP-18 — turunan langsung master §4.8
// ("tools — CRUD + update status" = pimpinan ✅ admin ❌ staff_gudang ✅,
// SATU-SATUNYA baris matriks di mana admin punya hak LEBIH SEDIKIT dari
// staff_gudang — fase-2-keuangan-operasional.md §4 WP-18). `access` di sini
// murni gerbang `RolesGuard` — tak ada aturan berbasis state untuk `tools`
// (beda dari `project-tools.rows.ts`), jadi baris ini SUDAH mencerminkan
// hasil bisnis akhir untuk modul ini.
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/tools',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
  {
    method: 'GET',
    path: '/tools/:id',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
  {
    method: 'POST',
    path: '/tools',
    access: allow('pimpinan', 'staff_gudang'),
  },
  {
    method: 'PATCH',
    path: '/tools/:id',
    access: allow('pimpinan', 'staff_gudang'),
  },
  {
    method: 'DELETE',
    path: '/tools/:id',
    access: allow('pimpinan'), // soft delete, FR-DEL-1
  },
  {
    method: 'PATCH',
    path: '/tools/:id/status',
    access: allow('pimpinan', 'staff_gudang'),
  },
];
