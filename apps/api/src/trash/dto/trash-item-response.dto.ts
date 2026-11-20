// Bentuk wire `GET /trash` (FR-DEL-6). Field diturunkan plugin swagger dari tipe TS; enum butuh dekorator.
import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';
import { TRASH_TYPES } from '../soft-delete';
import type { TrashType } from '../soft-delete';

export class TrashItemDto {
  @ApiProperty({ enum: TRASH_TYPES, enumName: 'TrashType' })
  type: TrashType;

  id: string;
  name: string;
  /** Proyek induk (node RAB, termin, pengeluaran, sub-proyek); null untuk master data. */
  projectId: string | null;
  projectName: string | null;
  deletedAt: Date;
  deletedBy: string | null;
  deletedByName: string | null;
}

export class TrashListResponseDto {
  data: TrashItemDto[];
  meta: PaginationMetaDto;
}
