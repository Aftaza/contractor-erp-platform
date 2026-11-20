// acme-backend/src/rab/dto/rab-summary-response.dto.ts
//
// KONTRAK RESPONSE — WP-14b (fase-1-vertikal-rab.md §4 WP-14b, master §5.6).
// Bentuk wire persis `RabSummary` (rab-summary.util.ts), sebagai `class`
// supaya plugin swagger punya wujud runtime (type alias/interface hilang
// saat kompilasi — U1). Tak ada enum di sini, jadi tak ada field yang perlu
// `@ApiProperty()` manual.
export class RabSummaryResponseDto {
  subtotal: number;
  ppnEnabled: boolean;
  ppnRate: number;
  ppnAmount: number;
  grandTotal: number;
}
