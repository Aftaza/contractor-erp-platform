// acme-backend/src/vendors/dto/vendor-response.dto.ts
//
// KONTRAK RESPONSE — aturan worker §6 #7 (fase-1 §6, fase-2 §6): kelas, bukan
// interface/type alias, supaya plugin swagger (nest-cli.json) menurunkan
// schema OpenAPI dari tipe TS. Tak ada kolom bigint/Decimal di `vendors` —
// bentuk wire sama persis bentuk Prisma `Vendor`.
export class VendorResponseDto {
  id: string;
  name: string;
  category: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Master §3.2 — bentuk `meta` seragam. */
export class VendorPaginationMetaDto {
  page: number;
  perPage: number;
  total: number;
}

/** Master §3.2 — `GET /vendors`. */
export class VendorListResponseDto {
  data: VendorResponseDto[];
  meta: VendorPaginationMetaDto;
}
