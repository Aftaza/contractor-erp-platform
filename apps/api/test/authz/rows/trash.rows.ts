// Baris matriks Tempat Sampah & pulihkan (SRS §3.2 "Hapus aman", FR-DEL-8):
// pimpinan saja — admin & staff_gudang 403, anonim 401.
import { MatrixRow, allow } from '../registry';

const RESTORE_PATHS = [
  '/projects/:id/restore',
  '/rab/nodes/:id/restore',
  '/termins/:id/restore',
  '/expenses/:id/restore',
  '/purchases/:id/restore',
  '/clients/:id/restore',
  '/vendors/:id/restore',
  '/tools/:id/restore',
];

export const rows: MatrixRow[] = [
  { method: 'GET', path: '/trash', access: allow('pimpinan') },
  ...RESTORE_PATHS.map((path) => ({
    method: 'POST',
    path,
    access: allow('pimpinan'),
  })),
];
