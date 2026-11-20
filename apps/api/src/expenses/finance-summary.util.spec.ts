// acme-backend/src/expenses/finance-summary.util.spec.ts
//
// Unit test ringkasan keuangan — master §9.1 titik dobel-hitung paling
// mungkin, DoD WP-17 (fase-2-keuangan-operasional.md §4). Minimal 5 kasus:
// (a) nol+nol, (b) hanya pembelian, (c) hanya expense, (d) keduanya (bukan
// dobel), (e) filter is_purchased=false didorong ke caller — dibuktikan di
// db-spec (expenses.db-spec.ts), bukan di sini karena fungsi ini menerima
// angka yang SUDAH difilter.
import { calculateFinanceSummary } from './finance-summary.util';

describe('calculateFinanceSummary — master §9.1', () => {
  it('(a) nol pembelian + nol expense = semua nol', () => {
    const result = calculateFinanceSummary(0, 0, 0);
    expect(result).toEqual({
      contractValue: 0,
      purchasedAmount: 0,
      expensesAmount: 0,
      realisasiBiaya: 0,
      selisih: 0,
    });
  });

  it('(b) hanya pembelian: realisasiBiaya = purchasedAmount', () => {
    const result = calculateFinanceSummary(500_000_000, 200_000_000, 0);
    expect(result.realisasiBiaya).toBe(200_000_000);
    expect(result.selisih).toBe(300_000_000);
  });

  it('(c) hanya expense: realisasiBiaya = expensesAmount', () => {
    const result = calculateFinanceSummary(500_000_000, 0, 50_000_000);
    expect(result.realisasiBiaya).toBe(50_000_000);
    expect(result.selisih).toBe(450_000_000);
  });

  it('(d) keduanya: dijumlah, BUKAN dobel — realisasiBiaya = purchased + expenses persis', () => {
    const result = calculateFinanceSummary(
      1_000_000_000,
      300_000_000,
      120_000_000,
    );
    expect(result.purchasedAmount).toBe(300_000_000);
    expect(result.expensesAmount).toBe(120_000_000);
    expect(result.realisasiBiaya).toBe(420_000_000); // bukan 600jt (dobel salah satu)
    expect(result.selisih).toBe(580_000_000);
  });

  it('(e) contractValue null → diperlakukan 0, tak melempar error', () => {
    const result = calculateFinanceSummary(null, 100_000_000, 50_000_000);
    expect(result.contractValue).toBe(0);
    expect(result.realisasiBiaya).toBe(150_000_000);
    expect(result.selisih).toBe(-150_000_000); // tak bermakna sebagai anggaran nyata, tapi tak 500
  });

  it('selisih negatif (realisasi melebihi kontrak) dihitung apa adanya', () => {
    const result = calculateFinanceSummary(100_000_000, 80_000_000, 50_000_000);
    expect(result.realisasiBiaya).toBe(130_000_000);
    expect(result.selisih).toBe(-30_000_000);
  });
});
