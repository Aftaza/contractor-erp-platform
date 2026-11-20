import { TerminStatus } from '@prisma/client';

/** Tanggal hari ini (YYYY-MM-DD) di zona Asia/Jakarta — "lewat jatuh tempo" mengikuti hari kalender WIB. */
export function jakartaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
    now,
  );
}

/**
 * Status termin diturunkan dari pembayaran (SRS FR-FIN-1). `dueDate` & `today`
 * = YYYY-MM-DD. Tepat di hari jatuh tempo belum Terlambat (Terlambat = lewat).
 */
export function deriveTerminStatus(
  t: { amount: number; paid: number; dueDate: string | null },
  today: string,
): TerminStatus {
  if (t.paid >= t.amount) return 'Lunas';
  if (t.dueDate !== null && today > t.dueDate) return 'Terlambat';
  return t.paid > 0 ? 'Sebagian' : 'BelumBayar';
}

/** PPN tampilan = ROUNDUP(DPP × tarif%) (FR-FIN-6). Integer: tak ada galat float. rate boleh desimal (maks 2 digit). */
export function ppnOf(dpp: number, ratePercent: number): number {
  const rate100 = Math.round(ratePercent * 100); // tarif dalam per-sepuluh-ribu
  return Number((BigInt(dpp) * BigInt(rate100) + 9999n) / 10000n);
}
