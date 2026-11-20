export type Category = "Semua" | "Industri" | "Infrastruktur" | "Sipil" | "Gedung";

export interface Project {
  title: string;
  year: string;
  cat: Category;
  client: string;
  /**
   * Lokasi proyek. Diisi baris yang datang dari ERP (`/public/projects`), yang
   * sengaja TIDAK memuat nama klien (batas kepercayaan ERP → situs publik).
   * Kartu portfolio menampilkan `client || location`, jadi baris statis lama
   * (yang punya `client`) tetap tampil persis seperti sebelumnya.
   */
  location?: string;
  /** Path dari root public/ — kosong ("") jika belum ada foto */
  img: string;
  /** Array gambar untuk rotasi otomatis. Jika tidak diisi, hanya img yang ditampilkan. */
  imgs?: string[];
}

// Data contoh (anonim): nama klien fiktif, tanpa foto proyek asli.
export const allProjects: Project[] = [
  { title: "Kontrak Payung Inspeksi NDT", year: "2019–2025", cat: "Industri", client: "PT Industri Semen Contoh", img: "" },
  { title: "Fabrikasi & Erection Bag Filter", year: "2022", cat: "Industri", client: "PT Industri Semen Contoh", img: "" },
  { title: "Maintenance Hoist Crane & Lift", year: "2022", cat: "Industri", client: "PT Industri Semen Contoh", img: "" },
  { title: "Fabrikasi Ducting & Damper Blade", year: "2023", cat: "Industri", client: "PT Industri Semen Contoh", img: "" },
  { title: "Steel Structure Net", year: "2023–2024", cat: "Industri", client: "PT Agro Contoh", img: "" },
  { title: "Fabrikasi & Instalasi Hydrant", year: "2024", cat: "Industri", client: "PT Agro Contoh", img: "" },
  { title: "Jembatan Pipa", year: "2023", cat: "Infrastruktur", client: "BUMN Karya Contoh", img: "" },
  { title: "Pipanisasi Gas", year: "2022", cat: "Infrastruktur", client: "Gas Nusantara Contoh", img: "" },
  { title: "Pembuatan Saluran Air", year: "2021", cat: "Sipil", client: "Pemerintah Kabupaten Contoh", img: "" },
  { title: "Steel Structure Aula Sekolah", year: "2024", cat: "Gedung", client: "Sekolah Contoh", img: "" },
];
