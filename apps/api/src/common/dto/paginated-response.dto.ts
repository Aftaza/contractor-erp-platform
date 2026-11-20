// acme-backend/src/common/dto/paginated-response.dto.ts

/** Bentuk response list seragam — master plan §3.2. Dipakai semua endpoint list domain. */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Bungkus data + meta ke bentuk §3.2. Helper tipis supaya bentuknya tak diketik ulang per modul. */
export function paginate<T>(
  data: T[],
  meta: PaginationMeta,
): PaginatedResponse<T> {
  return { data, meta };
}
