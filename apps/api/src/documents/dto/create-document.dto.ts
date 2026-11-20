// Field teks `POST /documents` (multipart; berkas di field `files`) — FR-DOC-1.
// `uploadedBy` dari `req.user.id`, tak pernah dari body.
import { DocumentCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  DateInRange,
  LongText,
  ShortText,
} from '../../common/validation/validation.decorators';

export class CreateDocumentDto {
  @ShortText()
  title!: string;

  @IsEnum(DocumentCategory, {
    message: 'category bukan kategori dokumen yang valid',
  })
  category!: DocumentCategory;

  /** Opsional — dokumen tender bisa ada sebelum proyek (FR-DOC-1). */
  @IsOptional()
  @IsUUID('all', { message: 'projectId harus UUID' })
  projectId?: string;

  @IsOptional()
  @LongText()
  notes?: string;

  /** Hanya kategori `legalitas` (FR-DOC-8). */
  @IsOptional()
  @DateInRange()
  validUntil?: string;
}
