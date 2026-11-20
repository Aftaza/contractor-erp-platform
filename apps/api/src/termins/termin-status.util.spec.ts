import { deriveTerminStatus, jakartaToday, ppnOf } from './termin-status.util';

describe('deriveTerminStatus', () => {
  const base = { amount: 100, dueDate: '2026-08-01' };
  it('Belum Bayar: tak ada pembayaran, belum jatuh tempo', () => {
    expect(deriveTerminStatus({ ...base, paid: 0 }, '2026-07-01')).toBe(
      'BelumBayar',
    );
  });
  it('Sebagian: sebagian dibayar, belum jatuh tempo', () => {
    expect(deriveTerminStatus({ ...base, paid: 40 }, '2026-07-01')).toBe(
      'Sebagian',
    );
  });
  it('Lunas: Σ bayar >= jumlah, meski lewat jatuh tempo', () => {
    expect(deriveTerminStatus({ ...base, paid: 100 }, '2026-09-01')).toBe(
      'Lunas',
    );
  });
  it('Terlambat: lewat jatuh tempo & belum lunas (termasuk sebagian)', () => {
    expect(deriveTerminStatus({ ...base, paid: 0 }, '2026-08-02')).toBe(
      'Terlambat',
    );
    expect(deriveTerminStatus({ ...base, paid: 40 }, '2026-08-02')).toBe(
      'Terlambat',
    );
  });
  it('batas: tepat di hari jatuh tempo belum Terlambat', () => {
    expect(deriveTerminStatus({ ...base, paid: 0 }, '2026-08-01')).toBe(
      'BelumBayar',
    );
  });
  it('tanpa jatuh tempo tak pernah Terlambat', () => {
    expect(
      deriveTerminStatus({ amount: 100, paid: 0, dueDate: null }, '2099-01-01'),
    ).toBe('BelumBayar');
  });
});

describe('jakartaToday', () => {
  it('23:30 UTC sudah hari berikutnya di WIB', () => {
    expect(jakartaToday(new Date('2026-07-31T23:30:00Z'))).toBe('2026-08-01');
    expect(jakartaToday(new Date('2026-07-31T16:59:00Z'))).toBe('2026-07-31');
  });
});

describe('ppnOf', () => {
  it('membulatkan ke atas', () => {
    expect(ppnOf(1_000_000, 11)).toBe(110_000);
    expect(ppnOf(1_001, 11)).toBe(111); // 110,11 -> 111
    expect(ppnOf(100, 0)).toBe(0);
  });
});
