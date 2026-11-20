// acme-backend/src/expenses/dto/create-expense.dto.ts
//
// Input `POST /projects/:id/expenses` — master §4.5, fase-2 §4 WP-17.
// `projectId` datang dari param URL; `recordedBy` dari `req.user.id` —
// keduanya SENGAJA tak ada di sini. `amount` punya CHECK (amount > 0) di DB
// (migration.sql `expenses_amount_positive`) — `@IsPositive()` menegakkannya
// JUGA di DTO supaya pesan errornya menyebut field, bukan error Postgres
// mentah (fase-2 §4 WP-17 "Isi" — keduanya, bukan salah satu).
import { ExpenseCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  DateInRange,
  LongText,
  Rupiah,
} from '../../common/validation/validation.decorators';

export class CreateExpenseDto {
  @LongText()
  description!: string;

  /** Rupiah. `bigint` di DB; CHECK `amount > 0` — DTO menolak ≤0 juga. */
  @Rupiah()
  amount!: number;

  @DateInRange()
  expenseDate!: string;

  @IsEnum(ExpenseCategory, {
    message: 'category bukan kategori pengeluaran yang valid',
  })
  category!: ExpenseCategory;

  /** Menunjuk `vendors.id` — FK tak dikenal ditolak di service (P2003 → 400). */
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @LongText()
  receiptUrl?: string;

  /** Bukti privat: dokumen kategori `bukti` proyek yang sama (FR-FIN-2) — divalidasi service. */
  @IsOptional()
  @IsUUID('all', { message: 'receiptDocumentId harus UUID' })
  receiptDocumentId?: string;

  @IsOptional()
  @LongText()
  notes?: string;
}
