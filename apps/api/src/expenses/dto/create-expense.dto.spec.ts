// acme-backend/src/expenses/dto/create-expense.dto.spec.ts
//
// Unit test validasi DTO (tanpa DB) — jaring pertama `amount > 0` (fase-2
// §4 WP-17 "keduanya, bukan salah satu"; jaring kedua = CHECK DB, diuji
// `expenses.db-spec.ts`). `class-validator`/`class-transformer` sudah
// dependency `ValidationPipe` global — tak ada dependency baru.
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateExpenseDto } from './create-expense.dto';

function build(overrides: Partial<CreateExpenseDto> = {}) {
  return plainToInstance(CreateExpenseDto, {
    description: 'Sewa alat',
    amount: 100_000,
    expenseDate: '2026-08-01',
    category: 'sewa_alat',
    ...overrides,
  });
}

describe('CreateExpenseDto — validasi amount > 0 (fase-2 §4 WP-17)', () => {
  it('amount = 0 ditolak dengan error yang menyebut field `amount`', async () => {
    const errors = await validate(build({ amount: 0 }));
    const amountError = errors.find((e) => e.property === 'amount');
    expect(amountError).toBeDefined();
    expect(amountError?.constraints).toHaveProperty('min');
  });

  it('amount negatif ditolak', async () => {
    const errors = await validate(build({ amount: -5000 }));
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('amount positif lolos validasi', async () => {
    const errors = await validate(build({ amount: 100_000 }));
    expect(errors).toHaveLength(0);
  });
});
