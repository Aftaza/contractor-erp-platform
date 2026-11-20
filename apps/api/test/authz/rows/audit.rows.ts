// acme-backend/test/authz/rows/audit.rows.ts
//
// Baris matriks otorisasi milik WP-22 (fase-3-pelaporan-publikasi.md §4,
// §2.1). Satu lapis: `@Roles('pimpinan')` di AuditController — PIMPINAN
// SAJA (master §4.8: "audit_logs — read: pimpinan ✅ admin ❌").
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/audit',
    access: allow('pimpinan'),
  },
];
