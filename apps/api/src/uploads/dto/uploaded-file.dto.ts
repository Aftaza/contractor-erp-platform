// acme-backend/src/uploads/dto/uploaded-file.dto.ts
//
// `GET /uploads/:filename` mengembalikan `StreamableFile` (bytes gambar
// biner), bukan JSON — jadi tak ada "bentuk response" nyata untuk
// dideskripsikan. Kelas KOSONG ini ada semata supaya
// `scripts/check-openapi-contract.ts` (beku, milik integrator, aturan worker
// §6 #7) menerbitkan `$ref` konkret alih-alih `{ "type": "object" }` kosong
// untuk endpoint ini — bukan deskripsi bentuk body sungguhan.
export class UploadedFileDto {}
