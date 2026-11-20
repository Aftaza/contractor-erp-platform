// acme-backend/src/rab/dto/rab-node-response.dto.ts
//
// KONTRAK RESPONSE — WP-14b (fase-1-vertikal-rab.md §4 WP-14b, §5b U4).
// Kelas di sini SEMATA supaya OpenAPI punya schema konkret untuk response
// `rab` (aturan §6 #7).
//
// DUA KELAS, SENGAJA — koreksi integrator atas WP-14b. Versi pertama memakai
// satu kelas untuk semua endpoint, beralasan "sama seperti
// `ProjectResponseDto` dipakai ulang di `projects`". Analoginya tidak
// berlaku: SETIAP field `ProjectResponseDto` benar-benar ada di setiap
// response `projects`. Sebaliknya `create`/`update`/`updateProgress`
// mengembalikan `RabNode` Prisma apa adanya — objek itu tak punya kunci
// `children` MAUPUN `rollup` sama sekali (bukan `[]` dan `0`, melainkan
// ABSEN). Satu kelas berarti tipe hasil generate menjanjikan keduanya wajib
// ada, lalu `node.rollup.toFixed(1)` di web meledak saat runtime — persis
// kelas drift senyap yang U1 dibuat untuk mencegah. Jadi bentuk pohon
// dipisah dari bentuk node datar.
//
// Field TIDAK didekorasi `@ApiProperty()` satu per satu: plugin CLI
// `@nestjs/swagger` menurunkannya dari tipe TS. Yang tetap butuh dekorator
// hanya enum (`nodeType`).
//
// BENTUK WIRE, BUKAN BENTUK DB: `bigint`/`Decimal` sudah `number` saat
// serialisasi (src/config/app-setup.ts, U2).
import { ApiProperty } from '@nestjs/swagger';
import { NodeType } from '@prisma/client';

export class RabNodeResponseDto {
  id: string;
  projectId: string;
  parentId: string | null;

  @ApiProperty({ enum: NodeType, enumName: 'NodeType' })
  nodeType: NodeType;

  name: string;
  sortOrder: number;

  // item-only (null untuk node grup).
  volume: number | null;
  unit: string | null;
  materialPrice: number | null;
  laborPrice: number | null;
  total: number | null;
  progressPercent: number;

  // Kolom pembelian lama (is_purchased/purchased_*/vendor_id) tak lagi bagian
  // kontrak — diganti nota pembelian (FR-FIN-3, R-001), lihat `purchase` di pohon.
  // shortcut: kolom lama masih ikut di JSON runtime sampai di-drop (R-003); klien jangan membacanya.

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bentuk pohon — HANYA `GET /projects/:id/rab/nodes`. Dua field di bawah
 * tak ada di response endpoint node tunggal, karena itu kelas terpisah.
 */
export class RabItemPurchaseDto {
  /** Σ jumlah baris nota aktif (satuan item). */
  purchasedQty: number;
  /** Σ subtotal baris nota aktif (DPP). */
  purchasedAmount: number;
  vendorCount: number;
  @ApiProperty({ enum: ['belum', 'sebagian', 'lengkap'] })
  status: 'belum' | 'sebagian' | 'lengkap';
}

export class RabNodeTreeResponseDto extends RabNodeResponseDto {
  /** Hanya node `item`; `null` untuk node grup (FR-FIN-3). */
  purchase: RabItemPurchaseDto | null;

  /**
   * Read-only, dihitung SAAT DIBACA (fase-1 §5b U4) — bukan kolom DB.
   * `rollup(n) = Σ(total × progress_percent)` atas node `item` keturunan
   * `n` ÷ `Σ(total)`; node `item` memakai `progressPercent` sendiri.
   */
  rollup: number;

  children: RabNodeTreeResponseDto[];
}
