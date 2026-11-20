// acme-backend/src/rab/dto/update-rab-node.dto.ts
import { OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRabNodeDto } from './create-rab-node.dto';

/**
 * Semua field `CreateRabNodeDto` KECUALI `nodeType`, opsional — tipe node
 * tak bisa diubah setelah dibuat (fase-1-vertikal-rab.md §4 WP-14 tak
 * memintanya; mengubahnya berarti membangun ulang node dari nol). Pola sama
 * seperti `UpdateProjectDto` (WP-13): `PartialType`/`OmitType` dari
 * `@nestjs/swagger` mempertahankan dekorator `class-validator` dasar.
 */
export class UpdateRabNodeDto extends PartialType(
  OmitType(CreateRabNodeDto, ['nodeType'] as const),
) {
  /** Pola A (FR-NTF-7): tetap simpan walau volume/harga material jadi di bawah Σ nota pembelian. */
  @IsOptional()
  @IsBoolean({ message: 'acknowledgeWarnings harus boolean' })
  acknowledgeWarnings?: boolean;
}
