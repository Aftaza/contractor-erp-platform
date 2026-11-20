// KONTRAK RESPONSE `GET /reports/vendors` — rekap pembelian per vendor
// (SRS FR-FIN-3): total belanja, jumlah item, riwayat harga satuan. Nominal DPP.
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';

export class ReportVendorPriceDto {
  rabNodeId: string;
  itemName: string;
  unit: string | null;
  projectId: string;
  projectName: string;
  noteDate: Date;
  quantity: number;
  unitPrice: number;
}

export class ReportVendorRowDto {
  /** `null` = nota tanpa vendor. */
  vendorId: string | null;
  vendorName: string;
  noteCount: number;
  itemCount: number;
  totalAmount: number;
  /** Baris terbaru dulu, maks 20 per vendor. */
  priceHistory: ReportVendorPriceDto[];
}

export class ReportVendorListResponseDto {
  data: ReportVendorRowDto[];
  meta: PaginationMetaDto;
}
