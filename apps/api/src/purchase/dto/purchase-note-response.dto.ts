// KONTRAK RESPONSE nota pembelian (SRS FR-FIN-3). `bigint`/`Decimal` sudah
// `number` saat serialisasi (app-setup.ts). Hanya baris aktif yang ikut.
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';

export class PurchaseVendorRefDto {
  id: string;
  name: string;
}

export class PurchaseItemRefDto {
  name: string;
  unit: string | null;
}

export class PurchaseLineResponseDto {
  id: string;
  purchaseNoteId: string;
  rabNodeId: string;
  rabNode: PurchaseItemRefDto;
  quantity: number;
  unitPrice: number;
  /** = ROUND(quantity × unitPrice), di-set DB. */
  subtotal: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PurchaseNoteResponseDto {
  id: string;
  projectId: string;
  vendorId: string | null;
  vendor: PurchaseVendorRefDto | null;
  noteNumber: string | null;
  noteDate: Date;
  receiptDocumentId: string | null;
  notes: string | null;
  recordedBy: string | null;
  /** Σ subtotal baris aktif (DPP). */
  total: number;
  lines: PurchaseLineResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class PurchaseNoteListResponseDto {
  data: PurchaseNoteResponseDto[];
  meta: PaginationMetaDto;
}
