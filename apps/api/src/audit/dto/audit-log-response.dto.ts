// acme-backend/src/audit/dto/audit-log-response.dto.ts
//
// KONTRAK RESPONSE `GET /audit` — fase-3-pelaporan-publikasi.md §2.2, §4
// WP-22. TUJUH KUNCI PERSIS, TAK LEBIH. `oldData`/`newData` SENGAJA TAK ADA
// di kelas ini — `audit_logs.new_data` memuat `to_jsonb(NEW)` UTUH dari
// tabel `users` (trigger DB, migration.sql baris 583/587/591), yang berarti
// `password_hash` argon2id. Bukan di-redact, bukan opsional — TAK ADA.
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';

export class AuditLogResponseDto {
  id: string;
  createdAt: Date;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  tableName: string | null;
  recordId: string | null;
}

/** Master §3.2 — `GET /audit`. */
export class AuditLogListResponseDto {
  data: AuditLogResponseDto[];
  meta: PaginationMetaDto;
}
