// acme-backend/test/authz/registry.ts
//
// SUMBER BARIS MATRIKS OTORISASI — turunan langsung master plan §4.8 (satu
// sumber kebenaran tunggal untuk otorisasi, master §5.2 & §12). Dibaca oleh
// harness `test/authz/matrix.ts` + `test/authz/matrix.e2e-spec.ts`.
//
// ATURAN KERAS (DoD WP-04, fase-0-fondasi.md §WP-04): SETIAP route yang
// benar-benar terdaftar di Nest (dienumerasi lewat DiscoveryService, bukan
// disisir manual) WAJIB py baris di sini. Tanpa baris -> harness GAGAL. Ini
// satu-satunya mekanisme yang mencegah endpoint baru Fase 1+ diam-diam lolos
// tanpa otorisasi (RLS sudah dilepas — master §0.1, §12).
//
// CARA MENAMBAH BARIS UNTUK MODUL BARU (Fase 1+): lihat README.md backend,
// bagian "Matriks otorisasi (Fase 1+)". Ringkas: buat SATU file
// `rows/<modul>.rows.ts` yang meng-export `rows: MatrixRow[]` — file ini
// memungutnya otomatis. File ini sendiri TAK perlu (dan tak boleh) disunting
// worker domain; kalau setiap paket menyuntingnya, 3 worker paralel dijamin
// bentrok di file yang sama (fase-1-vertikal-rab.md §2.2).
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { AppRole } from '../../src/common/decorators/roles.decorator';

export type Actor = AppRole | 'anonim';

export const ALL_ACTORS: readonly Actor[] = [
  'pimpinan',
  'admin',
  'staff_gudang',
  'anonim',
];

export interface MatrixRow {
  /** HTTP method, huruf besar — cocok dengan METHOD_METADATA Nest (lihat matrix.ts). */
  method: string;
  /**
   * Path route SEBAGAIMANA didaftarkan Nest — gabungan path controller +
   * path handler, TANPA prefix global `/api/v1` (prefix di-set belakangan
   * oleh `configureApp()`, tak muncul di metadata dekorator). Parameter
   * dinamis dalam bentuk `:id` (bukan nilai asli).
   */
  path: string;
  /**
   * true = actor tsb lolos guard chain (JwtAuthGuard -> MustChangePasswordAppGuard
   * -> RolesGuard) dan mencapai handler. Hasil BISNIS di baliknya (mis. 400
   * validasi DTO, 401 password salah, 403 dari PolicyService karena
   * rab_status) BUKAN urusan baris ini — itu tanggung jawab test modul
   * masing-masing (integration test WP domain) dan PolicyService (unit,
   * 100% cabang, master §9.7).
   */
  access: Record<Actor, boolean>;
}

/** Helper baca-enak: `allow('pimpinan','admin')` -> aktor lain otomatis false. */
export function allow(...actors: Actor[]): Record<Actor, boolean> {
  const access = {} as Record<Actor, boolean>;
  for (const actor of ALL_ACTORS) {
    access[actor] = actors.includes(actor);
  }
  return access;
}

/**
 * Baris milik modul domain — satu file per paket kerja di `rows/`, dipungut
 * saat test dimuat. Dipakai supaya tak ada satu file bersama yang harus
 * disunting semua worker paralel (fase-1-vertikal-rab.md §2.2). Dijalankan
 * ts-jest, jadi `require` sebuah `.ts` di sini sah.
 */
function collectDomainRows(): MatrixRow[] {
  const dir = join(__dirname, 'rows');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.rows.ts'))
    .sort()
    .flatMap((f) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(join(dir, f)) as { rows?: MatrixRow[] };
      if (!Array.isArray(mod.rows)) {
        throw new Error(
          `test/authz/rows/${f} harus meng-export \`rows: MatrixRow[]\` — lihat fase-1-vertikal-rab.md §2.2`,
        );
      }
      return mod.rows;
    });
}

const CORE_ROWS: MatrixRow[] = [
  // Catatan (penutup Fase 0): baris `GET /` (scaffold `nest new`) dihapus
  // bersama AppController/AppService-nya. JwtAuthGuard global fail-closed
  // membuatnya 401 — guard-nya bekerja benar, route-nya yang tak seharusnya
  // ada. Memberi @Public() pada kode sampah = melubangi harness demi nol
  // manfaat; menghapus route-nya menutup pertanyaannya sekaligus.

  // --- health (WP-01) — publik, master §5.1 ---
  {
    method: 'GET',
    path: '/health',
    access: allow('pimpinan', 'admin', 'staff_gudang', 'anonim'),
  },

  // --- auth (WP-03) ---
  // POST /auth/login: baris eksplisit master §4.8 ("✅ semua, termasuk anonim").
  {
    method: 'POST',
    path: '/auth/login',
    access: allow('pimpinan', 'admin', 'staff_gudang', 'anonim'),
  },
  // refresh & logout: @Public() di kode (master §3.3 — endpoint ini justru
  // dipakai SAAT access token sudah tak valid/kedaluwarsa, jadi tak boleh
  // mensyaratkan token access yang masih hidup). Tak eksplisit di tabel
  // §4.8 (yang hanya mencantumkan /auth/login), tapi konsisten dengan pola
  // yang sama: satu-satunya penjaga refresh/logout adalah validitas
  // refresh-token itu sendiri (business logic AuthService), bukan RolesGuard.
  {
    method: 'POST',
    path: '/auth/refresh',
    access: allow('pimpinan', 'admin', 'staff_gudang', 'anonim'),
  },
  {
    method: 'POST',
    path: '/auth/logout',
    access: allow('pimpinan', 'admin', 'staff_gudang', 'anonim'),
  },
  // change-password: TERAUTENTIKASI (bukan @Public()) tapi tanpa @Roles() —
  // semua role bisa ganti passwordnya sendiri; anonim ditolak JwtAuthGuard.
  // Juga satu-satunya route yang dikecualikan MustChangePasswordAppGuard
  // (jalan keluar dari status must_change_password=true — lihat
  // src/policy/guards/must-change-password-app.guard.ts).
  {
    method: 'POST',
    path: '/auth/change-password',
    access: allow('pimpinan', 'admin', 'staff_gudang'),
  },
];

export const AUTHZ_REGISTRY: MatrixRow[] = [
  ...CORE_ROWS,
  ...collectDomainRows(),
];
