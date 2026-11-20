// acme-backend/src/rab/rab-summary.util.spec.ts
//
// Unit test PPN + roundup — master §5.6, DoD WP-14 #4. Kasus batas wajib:
// subtotal yang SUDAH tepat kelipatan 100.000 TAK BOLEH naik satu tingkat.
import { calculateRabSummary, roundUpToStep } from './rab-summary.util';

describe('roundUpToStep', () => {
  it('nilai yang SUDAH tepat kelipatan tak boleh naik satu tingkat (kasus batas)', () => {
    expect(roundUpToStep(1_000_000, 100_000)).toBe(1_000_000);
  });

  it('nol tetap nol', () => {
    expect(roundUpToStep(0, 100_000)).toBe(0);
  });

  it('sedikit di atas kelipatan naik ke kelipatan berikutnya', () => {
    expect(roundUpToStep(1_000_001, 100_000)).toBe(1_100_000);
  });

  it('sedikit di bawah kelipatan naik ke kelipatan yang sama', () => {
    expect(roundUpToStep(999_999, 100_000)).toBe(1_000_000);
  });
});

describe('calculateRabSummary — master §5.6', () => {
  it('PPN nonaktif: ppnAmount nol, grandTotal = roundup(subtotal)', () => {
    const result = calculateRabSummary(1_234_567, false, 11);
    expect(result.ppnAmount).toBe(0);
    expect(result.grandTotal).toBe(1_300_000);
  });

  it('PPN aktif 11%, hasil sudah tepat kelipatan → tak naik (kasus batas)', () => {
    const result = calculateRabSummary(100_000_000, true, 11);
    expect(result.ppnAmount).toBe(11_000_000);
    expect(result.grandTotal).toBe(111_000_000);
  });

  it('PPN aktif 11%, hasil sedikit di atas kelipatan → naik satu tingkat', () => {
    // subtotal 100.000.001 * 11% = 11.000.000,11 -> dibulatkan 11.000.000
    // total 111.000.001 -> roundup ke 111.100.000
    const result = calculateRabSummary(100_000_001, true, 11);
    expect(result.ppnAmount).toBe(11_000_000);
    expect(result.grandTotal).toBe(111_100_000);
  });

  it('kasus batas: subtotal+PPN pas kelipatan 100.000 dari subtotal ganjil', () => {
    // 900.000 * 11% = 99.000 -> total 999.000 -> roundup 1.000.000
    const result = calculateRabSummary(900_000, true, 11);
    expect(result.ppnAmount).toBe(99_000);
    expect(result.grandTotal).toBe(1_000_000);
  });

  it('subtotal nol → semua nol, tak melempar error', () => {
    const result = calculateRabSummary(0, true, 11);
    expect(result).toEqual({
      subtotal: 0,
      ppnEnabled: true,
      ppnRate: 11,
      ppnAmount: 0,
      grandTotal: 0,
    });
  });
});
