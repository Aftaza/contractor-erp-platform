// acme-backend/src/termins/dto/termin-response.dto.ts
//
// KONTRAK RESPONSE — aturan wajib (fase-1 §6 #7, fase-2 §4 WP-17). `class`,
// bukan `interface`/`type` — plugin CLI `@nestjs/swagger` (nest-cli.json)
// menurunkan skema dari tipe TS, kecuali enum yang butuh `@ApiProperty`
// eksplisit. `amount` adalah `bigint` di DB, sudah jadi `number` saat
// serialisasi (src/config/app-setup.ts, U2) — ditulis `number` di sini.
import { ApiProperty } from '@nestjs/swagger';
import { TerminStatus, TerminType } from '@prisma/client';
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';

export class TerminResponseDto {
  id: string;
  projectId: string;
  name: string;

  @ApiProperty({ enum: TerminType, enumName: 'TerminType' })
  type: TerminType;

  amount: number;

  @ApiProperty({ enum: TerminStatus, enumName: 'TerminStatus' })
  /** Diturunkan dari pembayaran (FR-FIN-1) — bukan input. */
  status: TerminStatus;

  /** Σ pembayaran aktif (DPP). */
  totalPaid: number;
  /** Sisa tagihan DPP (min 0). */
  remaining: number;
  /** PPN tampilan = ROUNDUP(DPP × tarif); 0 bila proyek tak ber-PPN. */
  ppnAmount: number;
  totalWithPpn: number;

  dueDate: Date | null;
  /** Tanggal pembayaran terakhir saat Lunas, selain itu null. */
  paidDate: Date | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Master §3.2 — `GET /projects/:id/termins`. */
export class TerminListResponseDto {
  data: TerminResponseDto[];
  meta: PaginationMetaDto;
}
