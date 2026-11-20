// acme-backend/src/reports/dto/report-finance-response.dto.ts
//
// KONTRAK RESPONSE `GET /reports/finance` — fase-3-pelaporan-publikasi.md
// §2.4, §4 WP-20. Satu round-trip: ringkasan global + per klien + per bulan
// (bukan tiga endpoint terpisah — keputusan fase §2.4). `realisasiBiaya` /
// `profit` selalu lewat `calculateFinanceSummary` (§2.3), tak pernah
// dihitung ulang di frontend (master §6.3 #4).
export class ReportFinanceSummaryDto {
  contractTotal: number;
  terminTotal: number;
  paidTotal: number;
  purchasedTotal: number;
  expensesTotal: number;
  realisasiBiaya: number;

  /** `paidTotal - realisasiBiaya` (§2.3 — BUKAN rumus lama `paid - expenses`). */
  profit: number;

  activeProjects: number;
}

export class ReportFinanceByClientDto {
  clientId: string | null;
  clientName: string;
  /** Klien sudah dihapus — nama berlabel "dihapus" (FR-DEL-4). */
  clientDeleted: boolean;
  projectCount: number;
  contractTotal: number;
  paidTotal: number;
  realisasiBiaya: number;
  profit: number;
}

/** `period` format `YYYY-MM`. 12 bulan terakhir, bulan kosong tetap muncul bernilai 0 (§2.4). */
export class ReportFinanceByMonthDto {
  period: string;
  income: number;
  expense: number;
  profit: number;
}

export class ReportFinanceResponseDto {
  summary: ReportFinanceSummaryDto;
  byClient: ReportFinanceByClientDto[];
  byMonth: ReportFinanceByMonthDto[];
}
