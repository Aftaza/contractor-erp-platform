---
name: Acme Company Profile
description: Situs resmi PT Acme Konstruksi — bukti kemampuan kontraktor industri, bukan brosur.
colors:
  brand-red: "#CC0000"
  brand-red-deep: "#A30000"
  brand-red-tint: "#FBEAEA"
  ink: "#111418"
  steel-700: "#2E3439"
  steel-500: "#5B636B"
  steel-200: "#D9DDE1"
  concrete: "#F5F5F2"
  white: "#FFFFFF"
  on-dark-muted: "#A7AEB5"
  focus-on-dark: "#F5F5F2"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.6rem + 3vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  h3:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
  credential:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  none: "0px"
  sm: "2px"
  md: "4px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.brand-red}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: "14px 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.brand-red-deep}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "14px 24px"
    height: "48px"
  credential-row:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.credential}"
    padding: "16px 0"
  project-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  section-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.concrete}"
---

# Design System: Acme Company Profile

> Diperbarui 11 Nov 2026 setelah `/impeccable critique` (hero dua audiens, proyek tanpa foto, seksi gelap, testimoni, navigasi). Dibuat 11 Nov 2026 dengan bantuan ui-ux-pro-max (pola *Trust & Authority*, gaya *Accessible & Ethical*, dial variance 5 / motion 4 / density 4), lalu disesuaikan dengan `PRODUCT.md`. Palet navy/biru hasil pencarian sengaja **tidak dipakai**: merah logo Acme adalah aset brand yang mengikat. Ini **arah awal (seed)** untuk desain baru — markup situs sekarang bukan acuan; perbarui berkas ini setelah halaman pertama dibangun.

## Overview

**Arah: "Dokumentasi industri."** Situs dibaca seperti berkas kualifikasi vendor yang ditata dengan baik: foto lapangan asli, nomor sertifikat, nama klien, dan tahun proyek adalah elemen desain utamanya. Kesan yang dituju: *teliti, terbukti, siap diaudit* — cocok untuk panitia tender BUMN yang membandingkan vendor, dan cukup langsung bagi pemilik proyek swasta yang ingin segera menghubungi.

Prinsip visual:
- **Bukti sebagai ornamen.** Nomor SBU, NIB, nama klien, dan tahun tampil sebagai tipografi (mono kecil, rapi berbaris) — bukan disembunyikan di halaman legalitas.
- **Satu warna berbicara.** Merah Acme hanya untuk aksi utama (WhatsApp, "Lihat proyek") dan penanda kecil. Selebihnya baja dan beton.
- **Kontras tegas, sudut tegas.** Tanpa gradien, glassmorphism, atau bayangan lembut; struktur seperti gambar teknik.
- **Diam saat dibaca.** Animasi minim; konten tak pernah tersembunyi menunggu scroll (SEO/GEO).

Mode: **Persuade** (beranda, layanan, kontak) dan **Experience** ringan (halaman proyek: foto memimpin).

### Stack UI (keputusan 11 Nov 2026)
- **Tailwind 4 + shadcn/ui (React)**, dikustom dengan token di berkas ini (variabel CSS shadcn `--primary`, `--destructive`, `--radius`, dst. diisi dari `colors`/`rounded` di atas). Komponen shadcn milik situs sendiri — tidak dibagi dengan ERP.
- **Dirender statis saat build** (Astro merender komponen React menjadi HTML tanpa JS). Hanya komponen yang benar-benar interaktif yang menjadi island (`client:visible`/`client:idle`): menu HP (Sheet), filter portofolio, lightbox foto.
- **Animasi: library `motion` versi vanilla** (`animate`, `inView`, `scroll`) di `<script>` Astro — bukan `motion/react`. Konten tak pernah disembunyikan di HTML; animasi hanya ditambahkan setelah JS berjalan dan dinonaktifkan untuk `prefers-reduced-motion`.
- **Ikon: Lucide** — `@lucide/astro` untuk komponen Astro (SVG inline tanpa JS), `lucide-react` di dalam island. **Satu pengecualian:** logo merek WhatsApp memakai SVG resmi (`src/assets/brand/whatsapp.svg`, disediakan pemilik proyek) karena Lucide tak memuat ikon merek.

## Colors

### Primary
- `brand-red` `#CC0000` — merah logo. Tombol utama, tautan aksi, garis penanda aktif. Kontras teks: 5,9:1 di putih, 5,4:1 di `concrete` (lolos AA).
- `brand-red-deep` `#A30000` — hover/pressed tombol utama (teks putih 8,2:1).
- `brand-red-tint` `#FBEAEA` — latar sorotan kecil (badge "Proyek unggulan"); jangan untuk blok besar.

### Neutral
- `ink` `#111418` — teks utama, latar seksi gelap (**maksimal dua**: statistik & CTA penutup).
- `steel-700` `#2E3439` — teks sekunder tebal, footer.
- `steel-500` `#5B636B` — teks bantu, keterangan foto, metadata (6,1:1 di putih).
- `steel-200` `#D9DDE1` — garis pemisah, border kartu, rule tabel legalitas — **dekoratif saja** (1,37:1); kontrol interaktif (bila nanti ada input) memakai border `steel-500`.
- `concrete` `#F5F5F2` — latar seksi bergantian (beton hangat, bukan abu-abu kebiruan).
- `white` `#FFFFFF` — latar utama.

### Di atas latar gelap (`ink`)
- Teks utama `concrete` (16,9:1); teks bantu `on-dark-muted` `#A7AEB5` (8,2:1). **Bukan** `steel-500` (3,0:1 — gagal).
- Cincin fokus `focus-on-dark` (`concrete`, 3 px, offset 2 px) — cincin `ink` tak terlihat di latar `ink`.
- **Tidak ada teks atau tautan merah di atas `ink`** (3,1:1 — gagal). Merah hanya sebagai latar tombol (teks putih 5,9:1; tepi tombol vs `ink` 3,1:1 lolos untuk komponen non-teks).

### Named Rules
- **Aturan satu merah:** maksimal **satu elemen merah per viewport** (biasanya CTA WhatsApp). Karena itu di HP tombol WA header disembunyikan saat bar WA lengket tampil, dan CTA sekunder di seksi yang sama memakai gaya secondary. Merah tidak dipakai untuk teks panjang atau latar seksi penuh.
- **Oranye lama (`#f97316`) dihapus** — gagal kontras di putih (2,8:1) dan bersaing dengan merah logo.
- Tombol WhatsApp memakai `brand-red` + ikon WhatsApp, bukan hijau WhatsApp — agar tetap satu sistem.

## Typography

- **Plus Jakarta Sans** (self-host via `@fontsource-variable/plus-jakarta-sans`, bukan CDN Google — performa & privasi). Huruf karya desainer Indonesia (Tokotype), dirancang untuk teks berbahasa Indonesia; angka jelas dan bentuknya tegas tanpa terasa korporat-generik.
- **IBM Plex Mono** untuk nomor sertifikat, NIB/NPWP, kode KBLI, dan tahun proyek — memberi rasa "dokumen teknik".
- Angka statistik memakai `font-variant-numeric: tabular-nums`.

### Hierarchy
| Peran | Ukuran | Berat | Pakai |
|---|---|---|---|
| display | 36–64 px (clamp) | 800 | Satu per halaman: judul hero |
| h2 | 28–40 px | 700 | Judul seksi |
| h3 | 20 px | 700 | Judul kartu/layanan |
| body | 17 px / 1,65 | 400 | Paragraf, maks 68 karakter per baris |
| label | 13 px, huruf kapital, spasi 0,08em | 600 | Eyebrow seksi, kategori proyek |
| credential | 14 px mono | 500 | Nomor legalitas, tahun, kode |

### Named Rules
- Body tidak pernah < 16 px. Judul tidak lebih dari 3 baris di 360 px.
- Fakta penting (tahun berdiri, area layanan, jumlah proyek, legalitas) ditulis sebagai kalimat teks, tidak hanya angka besar tanpa konteks — agar dapat dikutip mesin AI.

## Layout

- Kontainer maks **1200 px**, padding sisi 20 px (mobile) / 32 px (≥ 768 px). Grid 12 kolom desktop, 4 kolom mobile.
- Ritme seksi: `xl` 96 px desktop, 64 px mobile. Seksi bergantian `white` / `concrete`; maksimal dua seksi `ink` (statistik & CTA penutup).
- Breakpoint: 360 · 768 · 1024 · 1280. Mobile-first; tanpa scroll horizontal.
- **Urutan beranda** — melayani dua pembaca sejak layar pertama:
  1. **Hero:** judul (siapa Acme + apa yang dikerjakan) · satu kalimat pendukung · **dua aksi**: "Hubungi via WhatsApp" (primary) dan **"Lihat legalitas & SBU"** (secondary, ke `#legalitas`) · **baris kredensial mono** di bawahnya: `Sejak 2017 · NIB 0000000000000 · 6 SBU KBLI · 3 izin instalasi listrik`. **Foto hero (keputusan 11 Nov 2026):** sementara memakai placeholder `src/assets/placeholder/hero-beranda.webp` (16:9) / `hero-beranda-mobile.webp` (4:5) lewat `<Picture>` art direction, dimuat eager + `fetchpriority="high"` (LCP), overlay `ink` agar teks lolos kontras AA; diganti foto asli sebelum go-live. Teks, aksi, dan baris kredensial tetap jadi pusat — foto adalah latar, bukan pesan.
  2. **Strip klien** langsung di bawah hero (bukti kedua dalam satu scroll).
  3. **Cerita kemitraan** — "Mitra pemeliharaan pabrik semen sejak 2019": garis waktu kontrak payung multi-tahun (NDT 2019–2025, Crusher 2019–2025, Rope Access 2019–2026, dst.) sebagai bar tahun horizontal; bukti "dipercaya bertahun-tahun" yang tak dimiliki kontraktor lain. Data dari `company-profile-data.md` §10.
  4. Layanan (4) → 5. Angka (seksi `ink`) & **legalitas ringkas** (`id="legalitas"`) → 6. Proyek unggulan (3) → 7. Alur kerja → 8. CTA penutup (seksi `ink`).
  - Seksi testimoni **tidak tampil** sampai tiap testimoni punya nama perusahaan & jabatan (lihat §Testimoni).
- Halaman proyek `/portofolio/<slug>`: foto sampul 3:2 memimpin + galeri; **tanpa foto** → kepala "lembar spesifikasi" (lihat Project card) dalam ukuran besar. Lalu metadata (klien, lokasi, rentang tahun, kategori) dalam baris mono, ringkasan, lingkup pekerjaan, dan tautan ke proyek lain dengan klien yang sama.
- Mobile: **bar WhatsApp lengket di bawah** (tinggi 56 px, safe-area aware) muncul setelah hero melewati layar; saat bar tampil, tombol WA di header disembunyikan (satu tombol WA per layar). Konten diberi padding bawah setara.

## Elevation & Depth

Datar. Kedalaman dari kontras warna latar (`white` ↔ `concrete` ↔ `ink`) dan garis `steel-200`, bukan bayangan.
- Satu-satunya bayangan: header lengket saat discroll, `0 1px 0 #D9DDE1` (garis, bukan blur).

## Shapes

- Sudut `sm` 2 px untuk tombol dan input, `md` 4 px untuk kartu & foto. Tidak ada sudut bulat besar atau pil.
- Foto proyek **satu rasio 3:2** untuk kartu dan header halaman proyek (foto unggahan sudah di-crop 3:2 di ERP), `object-fit: cover`, selalu dengan `width`/`height` eksplisit (CLS < 0,1) via `astro:assets` `<Image>`/`<Picture>` (AVIF/WebP).
- Motif garis: rule 1 px dan penanda merah 3 × 24 px di kiri eyebrow — gema garis ukur gambar teknik.

## Components

### Buttons
- **Primary** (`brand-red`, teks putih, tinggi 48 px): "Hubungi via WhatsApp", "Lihat semua proyek". Satu per seksi.
- **Secondary** (putih, border `ink` 1,5 px): aksi pendamping ("Lihat legalitas & SBU", "Unduh profil" bila nanti ada).
- **Kontak WhatsApp di desktop:** di samping tombol WA selalu tampil nomornya sebagai teks yang bisa dipilih + tautan `tel:` ("+62 800 0000 0001") — pengunjung desktop tanpa WhatsApp tetap bisa menelepon atau menyalin.
- Hover 150–200 ms (warna saja); focus ring 3 px `ink` dengan offset 2 px (di seksi `ink`: `focus-on-dark`); area sentuh ≥ 44 × 44 px.

### Cards / Containers
- **Project card** — dua varian dengan tinggi sama di grid:
  - *Dengan foto:* foto 3:2, label kategori, judul h3, baris mono "Klien · Lokasi · 2019–2025".
  - *Lembar spesifikasi (tanpa foto — mayoritas proyek saat ini):* blok `concrete` rasio 3:2 berisi label kategori, judul h3, klien, lokasi, **bar tahun mini** (rentang mulai–selesai pada skala 2017–sekarang; kontrak payung terlihat panjang), dan 2–3 butir lingkup pekerjaan dari ringkasan. Dirancang sebagai varian utama, bukan placeholder — tanpa ikon kamera atau "foto menyusul". Jangan foto pinjaman.
  - Seluruh kartu satu tautan.
- **Layanan:** ikon garis (Lucide, 24 px, stroke 1,5) + judul + 1 kalimat + daftar cakupan; tanpa ilustrasi stok.

### Credential row (komponen khas)
Tabel legalitas tanpa kotak: tiap baris = nama sertifikat (body) + nomor (mono) dipisah rule `steel-200`. Ringkasan 3 baris di beranda, lengkap di Tentang. Ini bukti utama untuk verifikator tender — harus bisa dipindai dalam 10 detik dan bisa dipilih/disalin teksnya.

### Stat block
Angka besar (display, tabular) + label + kalimat konteks ("150+ proyek selesai sejak 2017 untuk BUMN dan swasta"). Di seksi `ink`. Tanpa animasi count-up.

### Client logos
Grid statis (bukan carousel), kotak seragam tinggi tampil 120 px (sumber 240 px). Di perangkat dengan hover (`@media (hover: hover)`) logo grayscale opacity 70% → warna penuh saat hover/focus; di perangkat sentuh logo **selalu berwarna penuh** (tak ada hover). `alt` = nama klien. Klien tanpa logo tampil sebagai nama teks.

### Filter portofolio
Bukan per kategori (19 dari 22 proyek "Industri" — filternya tak berguna). Filter **per klien** (chip: Semua · Industri Semen Contoh · Agro Contoh · BUMN Karya Contoh · Gas Nusantara Contoh · Lainnya, dengan jumlah proyek) + urut tahun terbaru. Tanpa JS semua kartu tetap tampil (filter adalah peningkatan progresif, island `client:visible`).

### Navigation
- Header: logo kiri (= tautan Beranda), 5 tautan (Tentang, Layanan, Portofolio, FAQ, Kontak) dengan **penanda halaman aktif** (garis bawah 2 px `brand-red` + `aria-current="page"`), tombol WhatsApp kanan. Lengket, tinggi 64 px.
- Mobile: menu panel penuh (Sheet) dengan tautan besar (≥ 48 px), tutup lewat tombol X, Esc, atau tap di luar; fokus kembali ke tombol menu. Tombol WA header disembunyikan saat bar WA lengket tampil.
- **Lightbox foto:** tutup lewat X, Esc, tap latar, atau geser ke bawah; panah kiri/kanan & geser untuk berpindah; fokus terkunci di dalam dan kembali ke foto asal.
- Skip link "Langsung ke konten" sebagai elemen fokus pertama.

### FAQ & konten bertab
Accordion/Tabs shadcn bawaan tidak memasang panel tertutup ke DOM — jawaban FAQ hilang dari HTML yang dibaca Google & mesin AI. Di situs: pakai `<details>/<summary>` native yang diberi gaya shadcn, atau komponen dengan `forceMount` + `hidden` (konten tetap ada di HTML). JSON-LD `FAQPage` di halaman FAQ.

### Motion (yang boleh)
- Masuk-layar untuk seksi **di bawah layar pertama**: fade + geser ≤ 12 px, 300–400 ms, stagger ≤ 60 ms, sekali saja (`inView`, `once`).
- Layar pertama (hero, judul, baris kredensial) **tidak dianimasikan masuk** — tampil langsung agar LCP tidak tertunda.
- Hover kartu proyek: foto skala 1,03 dalam 300 ms; tombol: transisi warna 150–200 ms.
- Header: bayangan garis muncul saat scroll (`scroll`).
- Tidak ada: parallax, count-up, animasi berulang, animasi yang menunda tampilnya konten utama (LCP).

### Testimoni
Kutipan teks dengan nama, jabatan, dan perusahaan. **Keputusan 11 Nov 2026:** seksi ini disembunyikan sampai setiap testimoni yang tampil punya nama perusahaan & jabatan (data sekarang hanya "Klien" — PRD §10). Jangan avatar stok; jangan mengisi dengan testimoni anonim.

### Halaman sistem
- **404:** judul jelas + tautan ke Portofolio, Layanan, dan WhatsApp; bukan halaman kosong.
- **Gambar gagal dimuat:** kartu jatuh ke varian lembar spesifikasi (bukan ikon gambar rusak).

## Do's and Don'ts

### Do:
- Tampilkan nomor sertifikat, nama klien, dan tahun nyata — itu daya jual utama.
- Pakai foto lapangan asli; bila belum ada, tampilkan proyek tanpa foto.
- Hormati `prefers-reduced-motion`; animasi masuk hanya untuk seksi di bawah layar pertama, maksimal fade + geser 12 px, 300–400 ms.
- Semua teks penting tetap ada di HTML statis (tanpa JS), termasuk konten di bawah lipatan.
- JSON-LD `GeneralContractor` dan `Project` di setiap halaman yang relevan.

### Don't:
- Jangan foto stok "pekerja berhelm tersenyum", ilustrasi 3D, gradien ungu/pink, glassmorphism, atau emoji sebagai ikon. **Pengecualian sementara (keputusan 11 Nov 2026):** foto halaman (hero, layanan, tim) boleh memakai placeholder Unsplash di `src/assets/placeholder/` sampai foto asli tersedia — wajib ditandai `shortcut:` dan diganti sebelum go-live; tidak pernah untuk kartu/halaman proyek.
- Jangan carousel/slider untuk konten penting (hero, klien, testimoni).
- Jangan teks/tautan merah atau `steel-500` di atas `ink`; jangan lebih dari satu tombol merah per viewport.
- Jangan count-up angka, parallax, atau konten yang tersembunyi sampai di-scroll.
- Jangan klaim ISO/GAPENSI atau angka yang tidak ada di `docs/company-profile-data.md`.
- Jangan memuat font/skrip dari CDN pihak ketiga; semua aset disajikan dari Cloudflare Pages.
- Jangan ikon selain Lucide (kecuali SVG logo WhatsApp); jangan emoji sebagai ikon.
- Jangan mengirim React ke halaman yang tidak punya island; jangan `motion/react`.

Daftar aset gambar statis (nama, dimensi, batas ukuran): `docs/design-assets.md`.
