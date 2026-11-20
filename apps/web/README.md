# PT Acme Grup — Website Company Profile

Website company profile untuk **PT Acme Grup**, perusahaan konstruksi nasional Indonesia. Dibangun menggunakan **Astro 7** dengan React Islands untuk konten interaktif dan Tailwind CSS 4 untuk styling.

> **Versi publik anonim.** Nama perusahaan, klien, alamat, kontak, dan proyek di repo ini fiktif. Foto memakai stok Unsplash (lihat `src/assets/placeholder/SUMBER.md`).

---

## 🗂️ Struktur Proyek

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── AnimatedSection.tsx  ← Pembungkus statis `data-reveal` (animasi: skrip motion vanilla di Layout)
│   │   ├── Footer.astro         ← Footer global
│   │   ├── ImageWithFallback.tsx← Komponen gambar dengan fallback
│   │   └── Navbar.tsx           ← Navigasi utama (React island)
│   ├── islands/                 ← React islands (konten per halaman)
│   │   ├── HomePageContent.tsx
│   │   ├── AboutPageContent.tsx
│   │   ├── ServicesPageContent.tsx
│   │   ├── PortfolioPageContent.tsx
│   │   └── ContactPageContent.tsx
│   ├── layouts/
│   │   └── Layout.astro         ← Layout utama (Navbar + slot + Footer)
│   ├── pages/
│   │   ├── index.astro          ← Beranda (/)
│   │   ├── tentang.astro        ← Tentang Kami (/tentang)
│   │   ├── layanan.astro        ← Layanan (/layanan)
│   │   ├── portofolio.astro     ← Portofolio (/portofolio)
│   │   └── kontak.astro         ← Kontak (/kontak)
│   └── styles/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 🚀 Halaman Website

| Route | Halaman | Island | Status |
|---|---|---|---|
| `/` | Beranda | `HomePageContent.tsx` | ✅ Mockup selesai |
| `/tentang` | Tentang Kami | `AboutPageContent.tsx` | ✅ Mockup selesai |
| `/layanan` | Layanan | `ServicesPageContent.tsx` | ✅ Mockup selesai |
| `/portofolio` | Portofolio | `PortfolioPageContent.tsx` | ✅ Mockup selesai |
| `/kontak` | Kontak | `ContactPageContent.tsx` | ✅ Mockup selesai |

---

## 🧞 Commands

Semua perintah dijalankan dari direktori **root** proyek:

| Perintah | Aksi |
|---|---|
| `npm install` | Install semua dependensi |
| `npm run dev` | Jalankan dev server di `http://localhost:4321` |
| `npm run build` | Build production ke `./dist/` |
| `npm run preview` | Preview build production secara lokal |
| `npm run astro check` | TypeScript type-check file Astro |

---

## 🛠️ Tech Stack

### Root (Astro — Production)

| Teknologi | Versi | Keterangan |
|---|---|---|
| [Astro](https://astro.build) | ^7.4 | Framework utama (SSG penuh) |
| [@astrojs/react](https://docs.astro.build/en/guides/integrations-guide/react/) | ^5.0.4 | Integrasi React untuk islands |
| [React](https://react.dev) | ^19.2.6 | UI library untuk islands |
| [Motion](https://motion.dev) | ^12.38.0 | Animasi vanilla (`animate`, `inView`) |
| [Lucide React](https://lucide.dev) | ^1.14.0 | Icon set |
| [Tailwind CSS](https://tailwindcss.com) | ^4.2.4 | Styling utility-first |
| TypeScript | ^6.0.3 | Type safety |

## 🎨 Design Tokens

| Token | Nilai |
|---|---|
| **Primary Navy** | `#1e3a8a` |
| **Accent Orange** | `#f97316` (hover: `#ea580c`) |
| **Dark Background** | `#0f172a` |
| **Font** | Plus Jakarta Sans + IBM Plex Mono (fontsource, self-host) |
| **Bahasa UI** | Bahasa Indonesia |

---

## 📂 Dokumentasi

| File | Deskripsi |
|---|---|
| [`PRODUCT.md`](./PRODUCT.md) | Pengguna, tujuan, dan prinsip produk |
| [`DESIGN.md`](./DESIGN.md) | Sistem desain dan struktur halaman |

---

---

*Website ini dikembangkan sebagai bagian dari program Praktik Kerja Lapangan (PKL).*
