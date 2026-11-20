// acme-backend/src/rab/dto/create-rab-node.dto.ts
import { NodeType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  Rupiah,
  ShortText,
  Volume,
} from '../../common/validation/validation.decorators';

/**
 * Input pembuatan node RAB — master §4.3, fase-1-vertikal-rab.md §4 WP-14
 * aturan #4. Field item-only (`volume`/`unit`/`materialPrice`/`laborPrice`)
 * SENGAJA opsional di sini — aturan bentuk pohon (wajib untuk `item`,
 * terlarang untuk node grup) bergantung `nodeType` (cross-field), jadi
 * ditegakkan `RabService.assertValidNodeShape`, bukan dekorator per-field.
 * `progressPercent` & field pembelian TAK ADA di sini — dua sumbu terpisah
 * lewat endpoint sendiri (`PATCH .../progress`, nota pembelian FR-FIN-3).
 */
export class CreateRabNodeDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsEnum(NodeType)
  nodeType!: NodeType;

  @ShortText()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647) // batas Int4 Postgres
  sortOrder?: number;

  @IsOptional()
  @Volume()
  volume?: number;

  @IsOptional()
  @ShortText()
  unit?: string;

  /** Rupiah, bulat. `bigint` di DB — jauh di bawah Number.MAX_SAFE_INTEGER untuk harga satuan realistis (pola sama seperti `contractValue` WP-13). */
  @IsOptional()
  @Rupiah({ allowZero: true })
  materialPrice?: number;

  @IsOptional()
  @Rupiah({ allowZero: true })
  laborPrice?: number;
}
