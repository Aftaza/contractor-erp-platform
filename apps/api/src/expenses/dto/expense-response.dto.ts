// acme-backend/src/expenses/dto/expense-response.dto.ts
//
// KONTRAK RESPONSE — aturan wajib (fase-1 §6 #7, fase-2 §4 WP-17). `class`,
// bukan `interface`/`type`. `amount` (`bigint`) sudah jadi `number` saat
// serialisasi (U2) — ditulis `number` di sini.
import { ApiProperty } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';

export class ExpenseResponseDto {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  expenseDate: Date;

  @ApiProperty({ enum: ExpenseCategory, enumName: 'ExpenseCategory' })
  category: ExpenseCategory;

  vendorId: string | null;
  receiptUrl: string | null;
  receiptDocumentId: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Master §3.2 — `GET /projects/:id/expenses`. */
export class ExpenseListResponseDto {
  data: ExpenseResponseDto[];
  meta: PaginationMetaDto;
}
