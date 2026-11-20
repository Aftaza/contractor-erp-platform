// Input `POST /projects/:id/purchases` (SRS FR-FIN-3). Nominal DPP (PRD 30).
// `projectId` dari URL, `recordedBy` dari `req.user` — sengaja tak ada di sini.
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  DateInRange,
  LongText,
  Rupiah,
  ShortText,
  Volume,
} from '../../common/validation/validation.decorators';

export class PurchaseLineInputDto {
  /** Hanya PATCH: `id` baris aktif nota ini = ubah di tempat; tanpa `id` = baris baru. Diabaikan saat membuat nota. */
  @IsOptional()
  @IsUUID('all', { message: 'id baris harus UUID' })
  id?: string;

  /** Node `item` RAB dari proyek yang sama. */
  @IsUUID('all', { message: 'rabNodeId harus UUID' })
  rabNodeId!: string;

  /** Dalam satuan item RAB. */
  @Volume()
  quantity!: number;

  /** Rupiah DPP per satuan. */
  @Rupiah({ allowZero: true })
  unitPrice!: number;

  @IsOptional()
  @LongText()
  notes?: string;
}

export class CreatePurchaseNoteDto {
  @IsOptional()
  @IsUUID('all', { message: 'vendorId harus UUID' })
  vendorId?: string;

  @IsOptional()
  @ShortText()
  noteNumber?: string;

  @DateInRange()
  noteDate!: string;

  /** Bukti nota privat: dokumen kategori `bukti` proyek yang sama — divalidasi service. */
  @IsOptional()
  @IsUUID('all', { message: 'receiptDocumentId harus UUID' })
  receiptDocumentId?: string;

  @IsOptional()
  @LongText()
  notes?: string;

  @IsArray({ message: 'lines harus array' })
  @ArrayMinSize(1, { message: 'lines minimal 1 baris' })
  @ArrayMaxSize(200, { message: 'lines maksimal 200 baris' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineInputDto)
  lines!: PurchaseLineInputDto[];

  /** Pola A (FR-NTF-7): `true` = tetap simpan walau ada peringatan. */
  @IsOptional()
  @IsBoolean({ message: 'acknowledgeWarnings harus boolean' })
  acknowledgeWarnings?: boolean;
}
