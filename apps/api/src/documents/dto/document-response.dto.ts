// KONTRAK RESPONSE — kelas (plugin swagger menurunkan schema dari tipe TS).
// `size` (bigint) sudah jadi number saat serialisasi (app-setup.ts).
import { ApiProperty } from '@nestjs/swagger';
import { DocumentCategory } from '@prisma/client';
import { PaginationMetaDto } from '../../projects/dto/project-response.dto';

export class DocumentFileResponseDto {
  id: string;
  originalName: string;
  mime: string;
  size: number;
  sha256: string;
  createdAt: Date;
}

export class DocumentResponseDto {
  id: string;
  title: string;

  @ApiProperty({ enum: DocumentCategory, enumName: 'DocumentCategory' })
  category: DocumentCategory;

  projectId: string | null;
  notes: string | null;
  validUntil: Date | null;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  files: DocumentFileResponseDto[];
}

export class DocumentListResponseDto {
  data: DocumentResponseDto[];
  meta: PaginationMetaDto;
}
