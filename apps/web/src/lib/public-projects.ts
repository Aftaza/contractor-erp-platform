// src/lib/public-projects.ts
//
// WP-50 — sumber portfolio live dari ERP.
// Dokumen fase: acme-management/docs/superpowers/plans/fase-3-pelaporan-publikasi.md
// §2.6 (kontrak DTO publik, DIBEKUKAN) & §2.8 (keputusan situs).
//
// Dua sifat yang TIDAK boleh disederhanakan:
//   1. SEMUA kegagalan (jaringan, timeout, status != 200, JSON cacat, bentuk
//      tak sesuai) mengembalikan [] — TAK PERNAH melempar. Company profile
//      tak boleh tumbang karena ERP restart (master §7.2).
//   2. Ada timeout. API yang menggantung tak boleh membuat situs menggantung.
import type { Category, Project } from '../data/projects';

/** Kontrak beku §2.6 — TUJUH kunci, tak lebih. Nama klien sengaja tak ada. */
export interface PublicProjectDto {
  id: string;
  title: string;
  summary: string | null;
  category: 'Industri' | 'Infrastruktur' | 'Sipil' | 'Gedung' | null;
  images: string[];
  location: string;
  endDate: string | null; // ISO YYYY-MM-DD
}

// `import.meta.env` hanya ada di dalam Vite/Astro. `?.` supaya modul ini juga
// bisa diimpor polos oleh `node --test` (self-check WP-50) tanpa meledak.
const API_BASE_URL =
  import.meta.env?.PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
const UPLOADS_ORIGIN =
  import.meta.env?.PUBLIC_UPLOADS_ORIGIN ?? originOf(API_BASE_URL);
const FETCH_TIMEOUT_MS = 3000;

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/** Path relatif dari ERP (`/uploads/<uuid>.webp`) -> URL yang bisa dimuat browser. */
function toImageUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${UPLOADS_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * DTO publik -> bentuk `Project` yang sudah dipakai komponen portfolio.
 *
 * `client` sengaja kosong: DTO publik tak memuat nama klien (§2.6 — itu batas
 * kepercayaan, bukan kelalaian). Kartu menampilkan `location` di posisi itu
 * lewat `p.client || p.location` — jujur, bukan nama klien palsu.
 */
export function mapPublicProject(dto: PublicProjectDto): Project {
  const images = (dto.images ?? []).map(toImageUrl);
  return {
    title: dto.title,
    year: dto.endDate ? dto.endDate.slice(0, 4) : '',
    cat: (dto.category ?? 'Industri') as Category,
    client: '',
    location: dto.location,
    img: images[0] ?? '',
    imgs: images.length > 0 ? images : undefined,
  };
}

/** Bentuk minimal yang harus dipenuhi sebuah baris supaya dipakai. */
function isUsableDto(row: unknown): row is PublicProjectDto {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.title === 'string' && typeof r.location === 'string';
}

/**
 * Ambil proyek terbit dari ERP. Mengembalikan [] pada kegagalan APA PUN —
 * pemanggil menggabungkannya dengan data statis `src/data/projects.ts`.
 */
export async function fetchPublicProjects(): Promise<Project[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/projects?perPage=100`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return [];

    const body: unknown = await res.json();
    const rows = (body as { data?: unknown })?.data;
    if (!Array.isArray(rows)) return [];

    return rows.filter(isUsableDto).map(mapPublicProject);
  } catch {
    // Jaringan mati, timeout, JSON cacat — situs tetap tayang dengan fallback.
    return [];
  }
}
