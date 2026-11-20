// acme-backend/src/rab/rab-summary.util.ts
//
// Fungsi murni ringkasan uang RAB — master §5.6, fase-1-vertikal-rab.md §4
// WP-14 aturan #5. Σ total node item (dijumlahkan caller dari kolom `total`
// yang DIISI TRIGGER DB, tak pernah dihitung ulang di sini) → subtotal →
// PPN bila `ppn_enabled` → ROUNDUP ke kelipatan Rp100.000.
//
// RAB lama memakai `=SUM(G14:G205)/2` (dibagi 2 karena baris SUB TOTAL ikut
// ter-SUM) — hack itu TAK direplikasi; caller (`rab.service.ts`) sudah
// menjumlahkan node bertipe `item` saja lewat query `aggregate`.
export interface RabSummary {
  subtotal: number;
  ppnEnabled: boolean;
  ppnRate: number;
  ppnAmount: number;
  grandTotal: number;
}

const ROUNDUP_STEP = 100_000;

/**
 * Bulatkan NAIK ke kelipatan `step` terdekat lewat modulo integer — BUKAN
 * `Math.ceil(value / step) * step`. Pembagian floating-point pada nilai yang
 * SUDAH tepat kelipatan bisa menghasilkan galat (mis. `1.0000000000000002`)
 * yang membuat `Math.ceil` salah membulatkan naik satu tingkat — persis
 * kasus batas yang dilarang aturan #5 WP-14.
 */
export function roundUpToStep(value: number, step: number): number {
  const remainder = value % step;
  return remainder === 0 ? value : value + (step - remainder);
}

export function calculateRabSummary(
  subtotal: number,
  ppnEnabled: boolean,
  ppnRate: number,
): RabSummary {
  // Dibulatkan ke rupiah terdekat — hasil kali subtotal×persen jarang bulat,
  // dan mata uang tak punya pecahan di bawah rupiah.
  const ppnAmount = ppnEnabled ? Math.round(subtotal * (ppnRate / 100)) : 0;
  const grandTotal = roundUpToStep(subtotal + ppnAmount, ROUNDUP_STEP);
  return { subtotal, ppnEnabled, ppnRate, ppnAmount, grandTotal };
}
