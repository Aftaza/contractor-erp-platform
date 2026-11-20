// Matriks nota pembelian — SRS §3.2 (FR-FIN-3). `PATCH /rab/nodes/:id/purchase` dihapus (R-001).
import { MatrixRow, allow } from '../registry';

export const rows: MatrixRow[] = [
  {
    method: 'GET',
    path: '/projects/:id/purchases',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'POST',
    path: '/projects/:id/purchases',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'GET',
    path: '/purchases/:id',
    access: allow('pimpinan', 'admin'),
  },
  {
    method: 'PATCH',
    path: '/purchases/:id',
    access: allow('pimpinan', 'admin'),
  },
  { method: 'DELETE', path: '/purchases/:id', access: allow('pimpinan') },
];
