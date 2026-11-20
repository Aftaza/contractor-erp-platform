---
name: Acme ERP
description: Alat kerja internal Acme — angka proyek yang benar, terbaca sekilas dari HP maupun laptop.
colors:
  brand-red: "#CC0000"
  ink: "#1F2933"
  ink-hover: "#111418"
  text: "#1F2933"
  text-muted: "#5B636B"
  border: "#D9DDE1"
  border-strong: "#7B848D"
  surface: "#FFFFFF"
  canvas: "#F4F5F6"
  row-hover: "#EEF0F2"
  focus: "#111418"
  success: "#067647"
  success-tint: "#ECFDF3"
  warning: "#B54708"
  warning-tint: "#FFFAEB"
  danger: "#B42318"
  danger-tint: "#FEF3F2"
  info: "#175CD3"
  info-tint: "#EFF8FF"
  neutral: "#475467"
  neutral-tint: "#F2F4F7"
typography:
  page-title:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  section-title:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  table:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  metric:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-success:
    backgroundColor: "{colors.success-tint}"
    textColor: "{colors.success}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-warning:
    backgroundColor: "{colors.warning-tint}"
    textColor: "{colors.warning}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-danger:
    backgroundColor: "{colors.danger-tint}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-info:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.info}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-neutral:
    backgroundColor: "{colors.neutral-tint}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Acme ERP

> Diperbarui 11 Nov 2026 setelah `/impeccable critique` (dashboard, review RAB, saluran peringatan, istilah metrik, token kontras). Dibuat 11 Nov 2026 dengan bantuan ui-ux-pro-max (gaya *Minimalism & Swiss*, dial variance 2 / motion 2 / density 8; palet *Construction* dan pedoman UX tabel/angka/navigasi), disesuaikan dengan `PRODUCT.md`. Yang **tidak dipakai** dari hasil pencarian: pola *hero-centric* (milik landing page), pasangan font Inter + Playfair, aksen oranye, dan saran SvelteKit *form actions* (bertentangan dengan SPA tanpa server — SRS FE-1). Ini **arah awal (seed)**; perbarui setelah layout aplikasi dan dashboard dibangun.

## Overview

**Arah: "Buku kerja proyek yang rapi."** ERP mode **Operate**: pengguna datang untuk menyelesaikan tugas — mengecek uang proyek, mengisi progress, menyetujui RAB, mencatat pengeluaran. Desain mundur ke belakang; angka, status, dan aksi yang maju.

Prinsip visual:
- **Angka adalah antarmuka.** Rupiah dan persen rata kanan, `tabular-nums`, selalu berformat `Rp 1.234.567`; satuan dan asal angka (RAB / pembelian / pengeluaran) terlihat.
- **Status selalu teks + warna.** Tidak pernah hanya warna (buta warna, layar HP di bawah matahari).
- **Merah Acme bukan warna aksi.** Di ERP merah dibaca sebagai bahaya/terlambat; merah brand hanya di logo dan garis tipis aktif di navigasi. Aksi utama memakai `ink` (gelap netral).
- **Padat tapi bernapas.** Kepadatan tinggi di desktop (tabel RAB ±250 baris), target sentuh penuh di HP.
- **Mode terang saja.** Dipakai di lapangan dan kantor; kontras tinggi lebih penting daripada mode gelap.

### Stack UI (keputusan 11 Nov 2026)
- **Tailwind 4 + shadcn-svelte** (port shadcn untuk Svelte 5, berbasis bits-ui), dikustom dengan token di berkas ini; komponen milik ERP sendiri (`#lib/components/ui/`), tidak dibagi dengan situs. CLI shadcn-svelte mengasumsikan alias `$lib` — sesuaikan `components.json` dengan alias `#lib` atau salin komponen manual.
- **Ikon: `@lucide/svelte`** saja.
- Animasi dasar saja: transisi hover/fokus 150–200 ms, buka-tutup dialog/sheet/dropdown, masuk-keluar toast (transisi bawaan Svelte). Tanpa library animasi tambahan.
- Komponen berat dimuat *lazy* per route (crop gambar, chart, impor RAB, date picker) agar JS awal ≤ 100 KB gzip (SRS FE-9).

## Colors

### Primary
- `ink` `#1F2933` — tombol utama, teks utama, ikon aktif. Hover `ink-hover` `#111418`.
- `brand-red` `#CC0000` — **hanya** logo dan indikator 3 px item navigasi aktif. Bukan tombol, bukan teks.

### Neutral
- `canvas` `#F4F5F6` latar aplikasi · `surface` `#FFFFFF` kartu/tabel · `row-hover` `#EEF0F2`.
- `border` `#D9DDE1` garis tabel & kartu (**dekoratif saja** — 1,37:1). `border-strong` `#7B848D` untuk **border input, checkbox, dan kontrol** (3,8:1 di putih, 3,5:1 di canvas — WCAG 1.4.11).
- `text` `#1F2933` · `text-muted` `#5B636B` (6,1:1 di putih — boleh untuk label & metadata).
- `focus` `#111418` — cincin fokus 2 px + offset 2 px (celah putih) di semua elemen interaktif (18:1 di putih). Sengaja **bukan** biru `info`, agar fokus tak tertukar dengan status "Aktif/Dipakai".

### Status (semantik, teks ≥ 4,5:1 di putih dan di tint-nya)
| Token | Hex | Arti di Acme |
|---|---|---|
| `success` | `#067647` | Termin **Lunas**, RAB **Disetujui**, alat **Tersedia**/**Dikembalikan**, proyek **Selesai**, indikator biaya **Aman** |
| `warning` | `#B54708` | Perlu tindakan/perhatian: pengajuan alat **Menunggu**, RAB **Menunggu review**, termin **Sebagian**, alat **Maintenance**, proyek **Ditunda**, indikator biaya **Waspada** |
| `danger` | `#B42318` | Termin **Terlambat**, alat **Rusak**, pengajuan **Ditolak**, proyek **Dibatalkan**, indikator biaya **Kritis**, **melebihi anggaran**, aksi hapus |
| `info` | `#175CD3` | Sedang berjalan: proyek **Aktif**, alat **Dipakai**/**Diserahkan** |
| `neutral` | `#475467` | Belum berjalan, belum ada masalah: RAB **Draft**, termin **Belum Bayar** (belum jatuh tempo), pengajuan **Dibatalkan** (7,7:1 di putih) |

RAB draft dan termin yang belum jatuh tempo sengaja **netral**, bukan amber — proyek baru tidak boleh terlihat bermasalah.

### Named Rules
- **Aturan teks-plus-warna:** setiap badge status memuat kata ("Terlambat"), bukan titik warna saja.
- **Sisa Anggaran:** positif `text` biasa; negatif = **"Melebihi anggaran Rp …"** dengan `danger` + ikon `TriangleAlert` + tanda minus. Jangan hijau/merah saja.

### Istilah metrik baku (sama di UI, laporan, dan SRS FR-FIN-4)
| Istilah | Arti | Jangan dipakai |
|---|---|---|
| Nilai Kontrak | nilai kontrak terakhir (setelah addendum), sebelum PPN | "Kontrak", "Nilai proyek" |
| Total RAB | Σ item RAB sebelum PPN | "Anggaran" saja |
| Realisasi Biaya | Σ nota pembelian + Σ pengeluaran | "Biaya", "Pengeluaran total" |
| Sisa Anggaran | Total RAB − Realisasi Biaya | **"Selisih"** |
| Penyerapan | Realisasi Biaya ÷ Total RAB (%) | "Terpakai" |
| Progress Fisik | progress value-weighted (%) | "Progress" tanpa keterangan bila berdampingan dengan Penyerapan |
| Ditagih · Diterima · Piutang · Belum Ditagih | Σ termin · Σ pembayaran · Ditagih − Diterima · Nilai Kontrak − Ditagih | "Tagihan", "Hutang klien" |
| Perkiraan Margin | Nilai Kontrak − Realisasi Biaya (Rp dan %) | "Laba", "Untung" |
| Indikator Biaya | Aman / Waspada / Kritis (SRS FR-RAB-8) | "Status keuangan" |

Kolom RAB "Beli" diganti **"Pembelian"** (Belum / Sebagian / Lengkap). Setiap istilah di atas punya tooltip/teks bantu satu kalimat (ikon `CircleHelp`) di kartu metrik dan kepala kolom laporan.

## Typography

- **Inter Variable** (sudah dipakai situs lama; self-host via `@fontsource-variable/inter`). Fitur: `font-variant-numeric: tabular-nums` untuk semua kolom angka, `font-feature-settings: "cv11"` opsional untuk angka 1 yang jelas.
- Ukuran dasar 15 px di desktop; **16 px untuk input di HP** (mencegah zoom otomatis iOS).

### Hierarchy
| Peran | Ukuran | Berat | Pakai |
|---|---|---|---|
| page-title | 24 px | 700 | Judul halaman (nama proyek) |
| section-title | 17 px | 600 | Judul kartu/tab |
| body | 15 px | 400 | Teks umum |
| table | 14 px | 400 | Sel tabel (angka tabular) |
| label | 13 px | 500 | Label form, header kolom, metadata |
| metric | 24 px (desktop/tablet) · 20 px (HP) | 700 | Angka kartu metrik |

## Layout

- **Breakpoint navigasi (Tailwind kustom):** `< 720 px` bottom bar · `720–1023 px` sidebar ciut 64 px · `≥ 1024 px` sidebar penuh. 720 dipilih agar semua iPad (iPad mini tegak = 744 px) mendapat sidebar, sedangkan HP terbesar (±430 px) tetap bottom bar.
- **Desktop (≥ 1024 px):** sidebar kiri 240 px (bisa diciutkan ke 64 px ikon) + top bar 56 px (judul halaman, notifikasi, akun). Konten lebar penuh, padding 24 px; halaman form maks 720 px.
- **Tablet (720–1023 px):** sidebar ciut 64 px (ikon + tooltip; bisa dibuka sementara sebagai overlay).
- **HP (< 720 px):** **bottom navigation ≤ 5 item per role**, tinggi 56 px + safe area; top bar 52 px.
  - `pimpinan`: Dashboard · Proyek · Persetujuan (badge) · Laporan · Lainnya
  - `admin`: Dashboard · Proyek · Alat (pengajuan) · Laporan · Lainnya
  - `staff_gudang`: Dashboard · Alat · Serah Terima (badge) · Proyek · Lainnya
  - **Lainnya** (sheet bawah, daftar bertaut): `pimpinan` — Klien, Vendor, Dokumen, Publikasi Situs, Pengguna, Audit Log, Tempat Sampah, Akun Saya · `admin` — Klien, Vendor, Dokumen, Akun Saya · `staff_gudang` — Akun Saya, Keluar.
  - Tidak ada menu "Keuangan" terpisah: keuangan per proyek ada di tab Keuangan detail proyek, rekap lintas proyek di Laporan (SRS FR-RPT-2).
- Skala spasi 4 px (`1`=4 … `8`=32). Jarak antar kartu 16 px; padding kartu 16 px.
- **Detail proyek:** header (nama, kode proyek `ACME-ISC-2026-0F4E` (sub-proyek `ACME-ISC-2026-0F4E-0001`) dalam mono, dapat disalin, klien, status, Nilai Kontrak, tenggat: "sisa 23 hari" / "terlambat 5 hari") → **4 kartu metrik** berurutan menurut kepentingan pimpinan: **Progress Fisik** (+ Penyerapan dan badge Indikator Biaya) · **Sisa Anggaran** · **Piutang** · **Perkiraan Margin**. HP: grid 2 × 2. Rincian (Ditagih, Diterima, Belum Ditagih, rincian biaya) ada di tab Keuangan, bukan di kartu.
- **Tab detail proyek:** RAB · Keuangan · Pembelian · Alat · Dokumen (+ tab Sub-proyek untuk kontrak payung: daftar periode/SPK dengan progress, nilai, dan piutang masing-masing; induk menampilkan agregat, bukan RAB). Tab = URL sendiri (deep link, tombol back berfungsi). Di < 720 px tab menjadi baris yang bisa digeser horizontal, tab aktif selalu terlihat (auto-scroll) dan bayangan tepi menandai ada tab lain — tidak dibungkus ke baris kedua. Versi RAB, addendum, dan kurva S tinggal di dalam tab terkait (RAB / Keuangan), bukan tab baru.
- **Tabel:** desktop tabel penuh dengan header lengket; HP daftar kartu untuk list sederhana (proyek, pengeluaran, alat). **Pohon RAB tetap tabel** di HP dengan scroll horizontal di dalam kontainer dan kolom nama lengket — untuk *mengedit*; untuk *meninjau* dipakai layar Review RAB.

### Dashboard (per role) — layar pendaratan setelah login
Janji produk: pimpinan tahu kondisi semua proyek aktif dari HP dalam < 1 menit. Satu kolom di HP; dua kolom di ≥ 1024 px (kiri: Perlu Perhatian; kanan: ringkasan + proyek). Data: `GET /dashboard/attention` + `GET /dashboard/summary` (SRS FR-RPT-3), dimuat paralel, skeleton per blok.

1. **Perlu Perhatian** (selalu paling atas): maks 5 butir terlihat + "Lihat semua (n)". Tiap butir = ikon tingkat (`OctagonAlert` danger, `TriangleAlert` warning, `Info` info) + **satu kalimat yang menyebut objek, angka, dan waktu** ("Termin 2 · Hydrant KTM terlambat 12 hari — Rp 120.000.000") + tautan langsung ke tempat menindaklanjuti. Urut danger → warning → info, lalu terlama. Kosong → kartu `success` "Tidak ada yang perlu ditindaklanjuti" (bukan ruang kosong).
2. **Ringkasan** (3 angka, bukan lebih): `pimpinan`/`admin` — Proyek Aktif · Total Piutang · Proyek Waspada/Kritis. `staff_gudang` — Tersedia · Dipakai · Maintenance/Rusak.
3. **Proyek aktif** (`pimpinan`/`admin`): kartu ringkas, urut menurut risiko (Kritis → Waspada → terlambat → lainnya): nama + klien · **dua bar tipis bertumpuk** "Fisik 42%" dan "Biaya 71%" (selisihnya terbaca tanpa membaca angka) · badge Indikator Biaya · Piutang · tenggat. Tap → detail proyek.
4. **Aksi cepat** (maks 3): `admin` — Catat Pengeluaran · Nota Pembelian · Perbarui Progress (pilih proyek lewat sheet). `staff_gudang` — Catat Serah Terima · Catat Pengembalian. `pimpinan` — tidak ada (tindakannya lewat Perlu Perhatian/Persetujuan).

Isi Perlu Perhatian per role: `pimpinan` semua butir FR-RPT-3; `admin` termin terlambat, progress tak diperbarui, alat pengajuannya belum kembali, RAB dikembalikan; `staff_gudang` serah terima menunggu, alat belum kembali, alat rusak/maintenance.

### Review RAB (sebelum approve) — `/projects/[id]/rab/review`
Approve RAB adalah aksi paling berisiko; pimpinan tidak meninjau 250 baris di tabel 8 kolom. Masuk dari antrean Persetujuan atau banner di tab RAB ("Diajukan untuk approval oleh … · Tinjau"). Satu kolom di HP; di desktop rincian boleh dibuka sebagai tabel penuh. Admin dapat membuka layar yang sama (tanpa tombol approve) sebelum mengajukan.
1. **Kepala:** proyek, versi (v1 / revisi vN + alasan), diajukan oleh & kapan, catatan pengaju.
2. **Angka kunci:** Total RAB sebelum PPN · PPN · Total sesudah PPN (dibulatkan) · Nilai Kontrak · **Perkiraan Margin RAB** (Nilai Kontrak − Total RAB, Rp & %). RAB > Nilai Kontrak → panel `danger` "RAB melebihi Nilai Kontrak Rp …".
3. **Cek otomatis** (dari API): item harga 0 · volume 0 · item tanpa satuan · grup kosong · peringatan impor · Σ termin ≠ Nilai Kontrak. Tiap butir menyebut jumlah dan membuka item terkait. Semua lolos → baris `success` "Tidak ada temuan".
4. **Rincian per section:** daftar yang bisa dibuka — nama section, subtotal, % dari total, jumlah item; dibuka → daftar ringkas item (nama, volume + satuan, total) sebagai kartu baris, bukan tabel lebar.
5. **Revisi:** perbandingan dengan versi sebelumnya — jumlah item ditambah / dihapus / berubah dan selisih total, masing-masing bisa dibuka.
6. **Bar aksi lengket di bawah** (pimpinan): "Kembalikan ke Pengaju" (secondary; wajib alasan → notifikasi ke admin, RAB tetap draft) dan "Approve RAB" (primary) → dialog konfirmasi yang mengulang Total sesudah PPN, Nilai Kontrak, dan Perkiraan Margin RAB.

## Elevation & Depth

Hampir datar. Kartu = `surface` + border `border`, tanpa bayangan. Bayangan hanya untuk lapisan yang melayang:
- Dropdown/popover: `0 4px 12px rgb(17 20 24 / 0.12)`.
- Dialog & sheet bawah (HP): `0 12px 32px rgb(17 20 24 / 0.18)` + scrim `rgb(17 20 24 / 0.4)`.

## Shapes

`sm` 4 px badge · `md` 6 px tombol & input · `lg` 8 px kartu & dialog. Tanpa pil kecuali chip filter. Ikon Lucide (`@lucide/svelte`) 16 px di tabel, 20 px di navigasi, stroke 1,75.

## Components

### Buttons
- **Primary** `ink` (tinggi 40 px desktop, 44 px HP): satu per area — "Simpan", "Ajukan", "Approve RAB".
- **Secondary** putih + border `border-strong`: "Batal", "Ekspor".
- **Danger** `danger`: hanya di dalam dialog konfirmasi hapus/tolak, tidak pernah di toolbar langsung.
- Saat proses: tombol nonaktif + spinner + label tetap ("Menyimpan…"); cegah klik ganda.

### Inputs / Fields
- Label **di atas** field (bukan placeholder), teks bantu di bawah, error di bawah field dengan ikon + teks `danger`, plus ringkasan error di atas form untuk form panjang (fokus berpindah ke ringkasan).
- Input uang: prefiks "Rp", pemisah ribuan saat mengetik, `inputmode="numeric"`; nilai dikirim sebagai bilangan bulat — validasi akhir tetap di API.
- Tanggal: `<input type="date">` native.

### Money cell & metric card (komponen khas)
- Sel uang rata kanan, tabular, tanpa desimal, **selalu lengkap** ("Rp 1.234.567.890"); nilai nol "Rp 0", kosong "—". Tabel, form, dialog, dan laporan tidak pernah memakai singkatan.
- Kartu metrik: label (13 px muted, + `CircleHelp`) → angka → baris konteks ("dari Nilai Kontrak", "Penyerapan 62%"). **Satu-satunya tempat singkatan boleh dipakai:** angka kartu metrik & ringkasan dashboard di < 720 px bila angka lengkap tak muat — "Rp 1,23 M" (miliar) / "Rp 456,7 jt" (juta), nilai lengkap di `aria-label` dan tampil saat kartu ditekan. Angka diberikan API apa adanya; frontend hanya memformat.

### RAB tree table (komponen khas)
- Kolom: Uraian (indentasi 16 px per level, ikon chevron untuk grup) · Volume · Satuan · Harga Material · Harga Upah · Total · Progress · Pembelian.
- Baris grup (`section`/`subgroup`/`phase`) tebal 600 dengan latar `canvas`; baris `item` normal. Subtotal grup dari API.
- Grup dapat diciutkan; tombol "Ciutkan semua/Buka semua". Kolom Uraian lengket saat scroll horizontal.
- Saat RAB `approved`, sel harga terkunci (ikon gembok + tooltip "RAB sudah disetujui") untuk admin.

### Status badge
Badge `sm` dengan tint + teks status (lihat tabel Status, termasuk `neutral`). Ikon di depan untuk status kritis (Terlambat, Rusak, Kritis, Melebihi anggaran).

### Approval
- Daftar "Persetujuan" (pimpinan) = antrean RAB menunggu review & pemakaian alat menunggu, dengan jumlah di badge navigasi.
- **RAB:** selalu lewat layar Review RAB, bukan dialog langsung dari daftar.
- **Pemakaian alat:** kartu pengajuan memuat alat, jumlah vs stok tersedia, rentang tanggal, proyek, pengaju → Setujui / Tolak (dialog; tolak wajib alasan).

### Feedback
Empat saluran dengan peran tetap — rincian SRS §3.11:
- **Toast** (hasil aksi sendiri): bawah-tengah (HP) / kanan-bawah (desktop), 4 detik, `role="status"`; error tidak hilang otomatis; setelah hapus memuat **Urungkan** 10 detik.
- **Dialog konfirmasi**: hapus (soft delete, hanya pimpinan), approve/tolak, keluar dari form belum disimpan. Hapus proyek wajib ketik nama proyek.
- **Pusat notifikasi**: lonceng + badge di top bar; dropdown 400 px (desktop) / halaman penuh (HP); item = ikon tingkat + judul + waktu relatif + tautan ke objek.
- **Banner**: offline, sesi berakhir, versi baru, rebuild situs gagal — di bawah top bar sampai kondisi selesai.
- **Peringatan** (saluran ke-5, SRS §3.11):
  - *Pola A — konfirmasi sebelum simpan:* API mengembalikan daftar peringatan tanpa menyimpan → panel `warning` tepat di atas tombol aksi form; tiap peringatan satu kalimat + tautan ke data terkait; tombol **"Perbaiki"** (fokus awal) dan **"Tetap Simpan"** (secondary). Isian form tidak hilang. Dipakai: status proyek → Selesai saat progress < 100% / piutang > 0; nota melebihi volume atau anggaran material; pengeluaran mirip item RAB.
  - *Pola B — kondisi tersimpan:* panel `warning`/`danger` di bagian halaman terkait, tetap tampil selama kondisinya berlaku: Σ termin ≠ Nilai Kontrak (tab Keuangan), RAB > Nilai Kontrak (tab RAB & Review RAB), melebihi anggaran (kartu Sisa Anggaran).
  - Peringatan tidak pernah dikirim sebagai toast.
- Skeleton hanya bila muat > 300 ms; jaga tata letak tetap (tanpa lompatan).
- Empty state: satu kalimat penjelas + satu aksi ("Belum ada pengeluaran. Catat pengeluaran pertama").

### Navigation
- Sidebar: **Operasional** (Dashboard, Proyek, Persetujuan [P], Alat, Serah Terima [G]) · **Data** (Klien, Vendor, Dokumen — P/A) · **Laporan** (P/A) · **Pengaturan** (P: Publikasi Situs, Pengguna, Audit Log, Tempat Sampah). Akun Saya & Keluar di menu akun top bar. Item aktif: latar `row-hover` + garis kiri 3 px `brand-red`.
- Menu dan tombol disembunyikan sesuai role (kenyamanan saja; otorisasi tetap di API).

### Unggah gambar + crop (komponen khas)
Untuk foto portofolio & logo klien yang tampil di situs (SRS FR-PUB-2, FR-INT-2):
1. Pilih file → tolak langsung bila bukan format yang diterima (foto: JPEG/PNG/WebP; **logo: PNG/WebP saja** — JPEG tak punya transparansi, SVG ditolak karena dapat memuat script). **HEIC ditolak** dengan pesan: "Format HEIC (foto iPhone) belum didukung. Ubah di iPhone: Pengaturan › Kamera › Format › *Paling Kompatibel*, atau kirim ulang sebagai JPEG."
2. **Crop dengan rasio terkunci** (foto proyek 3:2; logo tanpa crop, hanya pratinjau di kotak seragam), dukung sentuh & keyboard; tampilkan resolusi hasil — tombol Simpan nonaktif bila di bawah minimum (foto 1800 × 1200; logo tinggi 240 px, rasio 1:1–6:1) dengan alasan tertulis.
3. Perkecil & kompres di browser ke WebP (sisi terpanjang ≤ 2400 px, kualitas ±0,85) → unggah dengan progress bar; gagal → pesan + coba lagi.
4. Galeri foto proyek: maks 10, urutkan dengan seret (dan tombol naik/turun untuk keyboard), foto pertama = sampul, teks alternatif per foto wajib.

### Charts
SVG ringan buatan sendiri (pengganti recharts): bar progress per proyek, garis realisasi biaya per bulan. Maks 3 seri; warna `ink`, `info`, `warning`; label nilai langsung pada grafik + tabel ringkas sebagai alternatif aksesibel.

## Do's and Don'ts

### Do:
- Format semua rupiah lewat satu helper (`Rp 1.234.567`) dan tanggal lewat `formatDate` (Asia/Jakarta).
- Pastikan setiap halaman punya URL sendiri, tombol back browser berfungsi, dan filter tersimpan di query string.
- Target sentuh ≥ 44 × 44 px di HP; fokus keyboard terlihat di semua elemen.
- Muat chart dan pengimpor RAB secara *lazy* per route (anggaran JS awal ≤ 100 KB gzip — SRS FE-9).
- Transisi 150–200 ms (warna/opacity saja); hormati `prefers-reduced-motion`.

### Don't:
- Jangan pakai merah Acme untuk tombol utama atau teks — tabrakan makna dengan bahaya/terlambat.
- Jangan menghitung uang, PPN, atau progress di frontend.
- Jangan status hanya-warna, angka rata kiri, atau angka tanpa pemisah ribuan.
- Jangan modal di atas modal; jangan aksi hapus tanpa konfirmasi.
- Jangan animasi dekoratif, gradien, glassmorphism, ilustrasi stok, atau emoji sebagai ikon.
- Jangan `+page.server.ts` / form actions SvelteKit — ERP adalah SPA statis.
