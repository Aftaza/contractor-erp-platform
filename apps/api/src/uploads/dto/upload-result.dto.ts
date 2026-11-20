// acme-backend/src/uploads/dto/upload-result.dto.ts
//
// Kontrak response `POST /uploads` (fase-3-pelaporan-publikasi.md §2.7) —
// aturan worker §6 #7: kelas DTO + `@ApiCreatedResponse`. `path` RELATIF
// (mis. "/uploads/<uuid>.webp"), bukan URL absolut — origin ditentukan
// konsumen (situs/proxy), bukan backend.
export class UploadResultDto {
  path: string;
}
