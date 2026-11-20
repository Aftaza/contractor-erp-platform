# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

±10 pengguna internal PT Acme Konstruksi, tiga role global (konsep v2, final):

- **`pimpinan`** — Direktur dan Komisaris (boleh lebih dari satu akun; tanggung jawab lewat audit log). Sering dari **HP**, di sela kunjungan proyek atau rapat. Tugas: dalam < 1 menit melihat status & keuangan semua proyek aktif; menyetujui RAB dan pemakaian alat sebagai pengawas; satu-satunya yang menghapus & memulihkan data (soft delete); mengelola user; membaca audit log; menerbitkan portofolio ke situs; mengelola dokumen tender/proyek.
- **`admin`** — Manager Operasional, manajer proyek, tim keuangan (pemetaan dari brief). Terutama dari **laptop** di kantor. Tugas: membuat proyek, mengimpor & menyusun RAB (pohon ±250 node) saat draft, mengisi progress, mencatat termin, pengeluaran, dan pembelian item RAB, mengelola klien/vendor, membuat laporan, mengunggah dokumen, **mengajukan pemakaian alat**. Tanpa hak hapus, kecuali node RAB selama draft.
- **`staff_gudang`** — petugas gudang. Dari **HP**, di gudang/workshop atau lokasi proyek dengan **sinyal terbatas**. Tugas: mengelola data & status alat, mencatat serah terima dan pengembalian alat yang sudah disetujui. Tanpa hak hapus; tanpa akses keuangan, RAB, maupun dokumen.

## Product Purpose

ERP internal yang menggantikan Excel keuangan proyek yang terpisah-pisah. Sukses berarti: 100% proyek aktif punya RAB approved di ERP; progress diperbarui ≥ 1×/minggu; tidak ada lagi Excel keuangan paralel; laporan keuangan per proyek siap < 5 menit; direktur melihat gambaran real-time dari HP.

## Positioning

Dibangun di sekitar cara Acme benar-benar bekerja: **RAB = milestone** (satu pohon section → subgroup → phase → item, diimpor dari format `.xlsx` Acme), progress dibobot nilai, dan realisasi biaya = pembelian item RAB + pengeluaran non-RAB. Hanya dua titik approval (RAB dan pemakaian alat) — sengaja ramping, bukan ERP generik dengan approval berlapis.

## Operating Context

- Siklus kerja: proyek dibuat → RAB diimpor/disusun (draft) → pimpinan approve → progress, pembelian, pengeluaran, termin dicatat berjalan → laporan → proyek selesai diterbitkan ke situs.
- Dokumen kerja nyata: file RAB Excel Acme (`docs/reference/*.xlsx`, data nyata — rahasia), dokumen tender, kontrak/SPK, BAST, invoice, K3, gambar teknik.
- Klien BUMN & swasta; kontrak `kontrak_payung` (multi-tahun) atau `one_time`; PPN per proyek 11% dengan pembulatan ke atas kelipatan Rp 100.000.
- Notifikasi in-app (bukan WhatsApp/email): toast, dialog konfirmasi, pusat notifikasi, banner (SRS §3.11).
- Alur alat: admin mengajukan → pimpinan menyetujui → staff gudang menyerahkan → staff gudang mencatat pengembalian.

## Capabilities and Constraints

- Modul v2: auth + wajib ganti password, user, proyek, RAB tree + impor + approve, progress, termin, pengeluaran (6 kategori, tanpa approval), pembelian item RAB, alat + pemakaian (approval), klien, vendor, dashboard, laporan, notifikasi, audit log, publikasi portofolio. Baru: dokumen privat (pimpinan & admin; hapus hanya pimpinan). kode proyek otomatis `Acme-<kode klien>-<tahun>-<4 heks acak>` (sub-proyek `-0001`); kontrak payung dipecah menjadi sub-proyek per periode/SPK (keputusan sementara).
- SvelteKit SPA statis (tanpa SSR) — dipilih karena klien mengeluhkan loading lama dan server terbatas (VPS 2 vCPU / 4 GB). Semua angka uang & progress dihitung API; frontend hanya menampilkan.
- Otorisasi hanya di API; menyembunyikan menu di UI hanya kenyamanan.
- Bahasa Indonesia saja; format `Rp 1.234.567`; tanggal zona Asia/Jakarta; nominal rupiah utuh.
- Harus berfungsi di lebar 360 px (tabel RAB boleh scroll di dalam kontainer).
- Bukan cakupan: payroll, inventori material, CRM, akuntansi, mode offline, aplikasi mobile native (nanti).

## Brand Commitments

- Alat internal milik **Acme** (logo `apps/web/src/assets/acme-logo.png`, merah `#CC0000`). Identitas brand cukup hadir; prioritas ERP adalah keterbacaan data, bukan ekspresi.
- Istilah domain dipakai apa adanya: RAB, termin (DP, termin, pelunasan, retensi), item, pengeluaran, pembelian, realisasi biaya, approve.

## Evidence on Hand

- Spesifikasi lengkap: `docs/PRD.md`, `docs/SRS.md` (matriks otorisasi §3.2), master plan v2 `docs/erp-v2/plans/2026-07-07-acme-erp-v2-rework.md`.
- ERP Next.js lama sebagai referensi alur & layar (bukan acuan visual): `git show 777a8c5:erp-management/<path>`; skenario E2E per role di `docs/erp-v2/e2e-nextjs/`.
- Contoh RAB nyata & analisis format: `docs/reference/` (jangan dipakai sebagai data demo/seed).
- Belum ada: data produksi, metrik pemakaian.

## Product Principles

1. **Angka benar dan terlacak** — setiap nominal datang dari API, jelas asalnya (RAB, pembelian, pengeluaran), dan setiap perubahan tercatat audit.
2. **Cepat di perangkat dan sinyal lemah** — halaman ringan; status penting terbaca dalam sekali lihat dari HP.
3. **Sesuai peran** — tiap role hanya melihat yang ia kerjakan; aksi berisiko (approve, hapus) eksplisit dan dikonfirmasi.
4. **Ikuti cara kerja Acme** — struktur RAB, istilah, dan alur mengikuti dokumen kerja yang sudah dipakai, bukan konvensi ERP generik.
5. **Ramping** — tidak menambah approval, field, atau langkah di luar konsep v2.

## Accessibility & Inclusion

WCAG 2.1 AA: label input, kontras ≥ 4.5:1, navigasi keyboard (SRS NFR-4); dipakai di luar ruangan dari HP oleh staf lapangan.
