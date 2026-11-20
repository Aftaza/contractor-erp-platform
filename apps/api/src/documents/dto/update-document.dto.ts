import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto';

/** Metadata saja (JSON); berkas ditambah lewat `POST /documents/:id/files`. `null` mengosongkan field opsional. */
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
