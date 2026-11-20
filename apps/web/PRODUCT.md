# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dua kelompok pengunjung dengan bobot **setara** (dikonfirmasi pemilik proyek, 11 Nov 2026):

- **Procurement / panitia tender BUMN & industri** (mis. Industri Semen Contoh, Pembangkit Listrik Contoh, BUMN Karya Contoh). Situasi: memverifikasi calon vendor sebelum atau selama tender — sering dari desktop kantor, membuka beberapa situs kontraktor bergantian. Tugas: memastikan Acme sah dan mampu — legalitas (SBU KBLI, izin instalasi listrik, NIB, NPWP), rekam proyek sejenis, klien terdahulu, K3.
- **Pemilik proyek swasta** (pemilik pabrik/usaha, sekolah, instansi lokal). Situasi: mencari kontraktor di Jawa Timur, sering dari HP, sering datang dari pencarian Google atau jawaban mesin AI. Tugas: cepat paham apa yang dikerjakan Acme, melihat bukti, lalu menghubungi lewat WhatsApp.

Audiens sekunder: mesin pencari dan crawler AI (situs harus terbaca dan mudah dikutip — SEO + GEO).

## Product Purpose

Situs resmi PT Acme Konstruksi — kontraktor mekanikal, sipil, elektrikal & supplier di Surabaya sejak 2017. Tujuannya menaikkan kredibilitas di tender dan mendatangkan kontak dari calon klien. Sukses berarti: pengunjung tender menemukan bukti legalitas & rekam jejak tanpa harus meminta dokumen; pengunjung swasta menghubungi via WhatsApp; seluruh halaman publik (termasuk tiap proyek) terindeks Google dan dapat dikutip mesin jawaban AI.

## Positioning

Kombinasi yang tidak bisa diklaim kontraktor tetangga dengan jujur:

1. **Spesialis maintenance & fabrikasi pabrik** — kontrak payung multi-tahun di pabrik semen sejak 2019 (NDT, crusher, reclaimer, drag bucket, hoist crane, gondola, rope access), bukan sekadar kontraktor bangunan umum.
2. **Workshop fabrikasi sendiri** di Sidoarjo — ducting, damper blade, steel structure, bag filter dikerjakan sendiri.
3. **Legalitas lengkap** — 6 SBU KBLI aktif + 3 izin instalasi tenaga listrik; lolos syarat administrasi tender.
4. **K3 ketat** di setiap proyek.

## Operating Context

- Dikunjungi dari tautan di dokumen penawaran/tender, pencarian lokal ("kontraktor mekanikal Surabaya/Jawa Timur"), dan profil direktori kontraktor.
- Kontak utama: **WhatsApp** (`wa.me/6280000000001`), telepon, email; jam kerja Senin–Jumat 08:00–17:00 WIB. Tidak ada form kontak.
- Situs statis di Cloudflare Pages; data portofolio, statistik, dan klien diterbitkan dari ERP internal lalu situs dibangun ulang (PRD §5.2, SRS §4).

## Capabilities and Constraints

- Halaman: Beranda, Tentang, Layanan, Portofolio (+ **satu halaman per proyek**), Kontak, FAQ. Bahasa Indonesia saja.
- Astro 6 statis penuh, React islands hanya bila perlu, Tailwind 4. Tidak ada runtime server; situs tetap tayang saat ERP/VPS mati.
- Kategori proyek publik tetap: Industri · Infrastruktur · Sipil · Gedung (tetap disimpan & ditampilkan sebagai label; filter portofolio memakai klien karena 19 dari 22 proyek berkategori Industri).
- Tidak ada: CMS di situs, blog, multi-bahasa, live chat, Google Analytics (keputusan klien).
- **Belum diputuskan:** domain final (nama kerja `ptacmegrup.id`); integrasi WhatsApp/animasi belum dijawab eksplisit oleh klien (versi lama memakai keduanya).
- Desain lama **akan dirombak** — markup & tampilan sekarang bukan acuan.

## Brand Commitments

- Nama resmi **PT ACME KONSTRUKSI** (fiktif, versi publik anonim), brand **Acme**.
- Logo: merah logo `#CC0000`, dua versi — untuk latar terang dan versi putih untuk latar gelap (`docs/design-assets.md`); sumber sekarang `src/assets/acme-logo.png`.
- Suara: profesional, faktual, lugas — klaim selalu ditopang angka/nomor sertifikat/nama klien.
- Klaim yang **tidak boleh** ditampilkan: ISO, GAPENSI (belum terkonfirmasi).

## Evidence on Hand

Sumber kebenaran: `docs/company-profile-data.md` (menang atas kode lama).

- Identitas & legalitas lengkap: NPWP, NIB, akta 2017, 6 SBU KBLI + 3 izin instalasi listrik beserta nomor.
- Statistik disetujui klien: 150+ proyek selesai, ★5 direktori kontraktor, 500+ tenaga ahli, 8+ tahun (dihitung dari 2017).
- 12 klien yang boleh dipublikasikan, 11 dengan logo di `src/assets/klien/`.
- 22 proyek portofolio (nama, tahun, kategori, klien); 3 proyek unggulan.
- Timeline 2017–kini; 4 layanan dengan cakupan; alur kerja 4 tahap; 4 keunggulan.
- 3 testimoni dengan izin publikasi, tetapi hanya nama + "Klien" tanpa perusahaan/jabatan → **tidak ditampilkan** sampai identitasnya lengkap (keputusan 11 Nov 2026).
- **Kekurangan yang tidak boleh dipalsukan:** foto asli hanya untuk 3 klien (`src/assets/dokumentasi-proyek/`, 3 foto masing-masing); proyek tanpa foto asli tampil **tanpa foto**, tidak meminjam foto proyek lain. Foto direksi (Direktur & Komisaris) **menyusul** — sudah diminta. Tidak ada media sosial.

## Product Principles

1. **Bukti dulu, klaim belakangan** — setiap pernyataan kemampuan disertai nomor sertifikat, nama klien, atau proyek nyata.
2. **Melayani dua pembaca sekaligus** — verifikator tender menemukan legalitas & rekam jejak dalam satu-dua langkah; calon klien swasta selalu dekat dengan tombol WhatsApp.
3. **Kejujuran visual** — tidak ada foto pinjaman, angka karangan, atau logo klien tanpa izin.
4. **Terbaca mesin** — fakta ditulis sebagai teks HTML eksplisit (bukan hanya di gambar/animasi), satu halaman per proyek, data terstruktur.
5. **Ringan dan selalu hidup** — statis, cepat di sinyal seluler, tak bergantung pada server ERP.

## Accessibility & Inclusion

WCAG 2.1 AA; Lighthouse mobile ≥ 90 untuk performance, SEO, accessibility, best practices (SRS NFR-2, NFR-4).
