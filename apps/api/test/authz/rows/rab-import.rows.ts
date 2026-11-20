// acme-backend/test/authz/rows/rab-import.rows.ts
//
// Baris matriks otorisasi milik WP-15 (fase-1-vertikal-rab.md §2.2, §4).
// `access` menggambarkan gerbang JwtAuthGuard+RolesGuard (siapa LOLOS ke
// handler) — penolakan "rab_status sudah approved" (bisnis, bukan role)
// urusan `RabImportService.import`, bukan baris ini (pola sama seperti
// `rab.rows.ts` milik WP-14).
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'POST',
    path: '/projects/:id/rab/import',
    access: allow('pimpinan', 'admin'),
  },
];
