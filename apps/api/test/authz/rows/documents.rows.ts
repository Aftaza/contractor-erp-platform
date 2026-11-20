// Baris matriks dokumen privat — SRS §3.2 "Master data, dokumen", §3.9:
// pimpinan & admin; hapus/pulihkan pimpinan saja; staff_gudang 403, anonim 401.
// `PATCH /documents/:id/publication` = tahap 2 (§4.1), belum ada route.
import { MatrixRow, allow } from '../registry';

const PA = allow('pimpinan', 'admin');
const P = allow('pimpinan');

export const rows: MatrixRow[] = [
  { method: 'GET', path: '/documents', access: PA },
  { method: 'GET', path: '/documents/:id', access: PA },
  { method: 'POST', path: '/documents', access: PA },
  { method: 'PATCH', path: '/documents/:id', access: PA },
  { method: 'POST', path: '/documents/:id/files', access: PA },
  { method: 'GET', path: '/documents/:id/files/:fileId', access: PA },
  { method: 'DELETE', path: '/documents/:id', access: P },
  { method: 'POST', path: '/documents/:id/restore', access: P },
];
