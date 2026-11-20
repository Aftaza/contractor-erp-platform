// acme-backend/src/auth/password-policy.spec.ts
//
// Fase 4 WP-53 (fase-4-deploy-verifikasi.md §2.9). Menguji ketiga aturan
// `isCommonPassword` PLUS yang paling mudah salah: password wajar harus
// LOLOS. Penolak yang menolak segalanya sama tak bergunanya dengan yang tak
// menolak apa pun.
import { isCommonPassword } from './password-policy';

describe('isCommonPassword (WP-53, master §10)', () => {
  it('menolak password dari daftar terlantas, tak peduli huruf besar/kecil', () => {
    expect(isCommonPassword('password1234')).toBe(true);
    expect(isCommonPassword('PassWord1234')).toBe(true);
    expect(isCommonPassword('  qwerty123456  ')).toBe(true);
    expect(isCommonPassword('indonesia123')).toBe(true);
  });

  it('menolak password yang memuat nama perusahaan', () => {
    expect(isCommonPassword('acmeSuperAman99')).toBe(true);
    expect(isCommonPassword('rahasiaAcme2026')).toBe(true);
  });

  it('menolak password yang memuat bagian lokal email', () => {
    expect(
      isCommonPassword('budi.santoso99', 'budi.santoso@contoh.co.id'),
    ).toBe(true);
    expect(isCommonPassword('XxBUDIxX-2026!', 'budi@contoh.co.id')).toBe(true);
  });

  it('mengabaikan bagian lokal email yang terlalu pendek untuk bermakna', () => {
    // Local part "ab" (2 karakter) akan cocok dengan hampir semua kalimat —
    // aturannya sengaja menuntut >= 3 karakter.
    expect(isCommonPassword('Kabupaten-Merah-77', 'ab@contoh.co.id')).toBe(
      false,
    );
  });

  it('meloloskan password wajar', () => {
    expect(isCommonPassword('Jembatan-Ungu-2026')).toBe(false);
    expect(isCommonPassword('7Gerbong#Kelapa!')).toBe(false);
    expect(
      isCommonPassword('Sepeda-Biru-Pagi-9', 'budi.santoso@contoh.co.id'),
    ).toBe(false);
  });

  it('tanpa email, aturan ketiga tak pernah aktif', () => {
    expect(isCommonPassword('Sepeda-Biru-Pagi-9')).toBe(false);
    expect(isCommonPassword('Sepeda-Biru-Pagi-9', undefined)).toBe(false);
  });
});
