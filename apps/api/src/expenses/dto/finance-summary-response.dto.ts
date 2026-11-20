// acme-backend/src/expenses/dto/finance-summary-response.dto.ts
//
// KONTRAK RESPONSE `GET /projects/:id/finance/summary` — fase-2 §2.2, §4
// WP-17. Bentuk wire persis `FinanceSummary` (finance-summary.util.ts), tapi
// SEBAGAI KELAS supaya plugin swagger punya wujud runtime (U1). TIDAK memuat
// Total RAB — itu milik `GET /projects/:id/rab/summary` (WP-14, modul lain,
// fase-2 §2.2 batas modul keuangan).
export class FinanceSummaryResponseDto {
  /** Nilai kontrak proyek. `null` bila belum diisi — diperlakukan 0 di `selisih`. */
  contractValue: number;

  /** Σ `purchase_lines.subtotal` baris & nota aktif (DPP, FR-FIN-3). */
  purchasedAmount: number;

  /** Σ `expenses.amount`. */
  expensesAmount: number;

  /** `purchasedAmount + expensesAmount`. */
  realisasiBiaya: number;

  /**
   * `contractValue - realisasiBiaya`. TAK BERMAKNA selama `contractValue`
   * proyek belum diisi (`null` diperlakukan 0 di sini, bukan "kontrak nol
   * rupiah sungguhan") — jangan ditampilkan sebagai kelebihan/kekurangan
   * anggaran nyata pada kondisi itu.
   */
  selisih: number;
}
