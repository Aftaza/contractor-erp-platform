// acme-backend/src/rab-import/dto/rab-import-result.dto.ts
//
// Kontrak response `POST /projects/:id/rab/import` — aturan worker §6 #7
// (fase-1-vertikal-rab.md): endpoint baru WAJIB kelas DTO response + decorator
// `@ApiCreatedResponse` di handler, supaya `npm run check:openapi` tak
// menandainya kosong. Field polos (tak perlu `@ApiProperty()` — plugin CLI
// `@nestjs/swagger` menurunkannya dari tipe TS, nest-cli.json).
export class RabImportResultDto {
  projectId: string;

  /** Total node yang berhasil ditulis (semua tipe). */
  totalNodes: number;

  sectionCount: number;
  subgroupCount: number;
  phaseCount: number;
  itemCount: number;
}
