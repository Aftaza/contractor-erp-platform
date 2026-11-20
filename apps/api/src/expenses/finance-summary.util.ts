// acme-backend/src/expenses/finance-summary.util.ts
//
// Fungsi murni ringkasan keuangan proyek — master §9.1, fase-2 §2.2 & §4
// WP-17. Ditandai master §9.1/§12 sebagai TITIK DOBEL-HITUNG PALING MUNGKIN
// di seluruh plan: dua sumber uang dijumlah (`purchasedAmount` dari
// Σ `purchase_lines.subtotal` aktif — FR-FIN-3, `expensesAmount` dari
// `Σ expenses.amount`). Fungsi ini TAK PERNAH memfilter baris — itu
// tanggung jawab query caller (`expenses.service.ts`, `reports.service.ts`);
// di sini murni penjumlahan dua angka yang SUDAH benar difilter, supaya
// bisa diuji tanpa DB (fase-1 §6 #7, pola sama `rab-summary.util.ts`).
export interface FinanceSummary {
  contractValue: number;
  purchasedAmount: number;
  expensesAmount: number;
  realisasiBiaya: number;
  selisih: number;
}

/**
 * `contractValue` boleh `null` (kontrak belum diisi) → diperlakukan 0 di
 * sini (fase-2 §2.2). `selisih` pada kondisi itu tak bermakna sebagai
 * kelebihan/kekurangan anggaran nyata — itu tanggung jawab pemanggil UI
 * untuk tak menampilkannya sebagai fakta, bukan tanggung jawab fungsi ini.
 */
export function calculateFinanceSummary(
  contractValue: number | null,
  purchasedAmount: number,
  expensesAmount: number,
): FinanceSummary {
  const contract = contractValue ?? 0;
  const realisasiBiaya = purchasedAmount + expensesAmount;
  return {
    contractValue: contract,
    purchasedAmount,
    expensesAmount,
    realisasiBiaya,
    selisih: contract - realisasiBiaya,
  };
}
