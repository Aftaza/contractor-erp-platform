import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseNoteDto } from './create-purchase-note.dto';

/** Semua field opsional. `lines` bila dikirim = daftar baris lengkap, di-diff per `id` (lihat PurchaseService.update). */
export class UpdatePurchaseNoteDto extends PartialType(CreatePurchaseNoteDto) {}
