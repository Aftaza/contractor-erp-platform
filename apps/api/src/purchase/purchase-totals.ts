// Agregat pembelian per item RAB dari baris nota AKTIF (baris & nota belum
// dihapus) — satu sumber untuk status pembelian di pohon RAB dan peringatan
// pola A nota (SRS FR-FIN-3). Satu query per proyek, bukan per item.
import { Prisma } from '@prisma/client';
import { ApiWarningDto } from '../common/warnings';
import { PrismaService } from '../prisma/prisma.service';

export type PurchaseStatus = 'belum' | 'sebagian' | 'lengkap';

export interface ItemPurchaseTotals {
  qty: Prisma.Decimal;
  amount: bigint;
  vendorCount: number;
}

export async function purchaseTotalsByNode(
  prisma: PrismaService,
  projectId: string,
  excludeNoteId: string | null = null,
): Promise<Map<string, ItemPurchaseTotals>> {
  const rows = await prisma.$queryRaw<
    { id: string; qty: Prisma.Decimal; amount: bigint; vendors: bigint }[]
  >`
    SELECT pl."rab_node_id" AS id,
           SUM(pl."quantity") AS qty,
           SUM(pl."subtotal")::bigint AS amount,
           COUNT(DISTINCT pn."vendor_id") AS vendors
    FROM "purchase_lines" pl
    JOIN "purchase_notes" pn ON pn."id" = pl."purchase_note_id"
    WHERE pn."project_id" = ${projectId}::uuid
      AND pl."deleted_at" IS NULL
      AND pn."deleted_at" IS NULL
      AND pn."id" IS DISTINCT FROM ${excludeNoteId}::uuid
    GROUP BY 1
  `;
  return new Map(
    rows.map((r) => [
      r.id,
      { qty: r.qty, amount: r.amount, vendorCount: Number(r.vendors) },
    ]),
  );
}

/** `belum | sebagian | lengkap` dari Σ jumlah dibeli vs volume item. */
export function purchaseStatus(
  qty: Prisma.Decimal.Value,
  volume: Prisma.Decimal.Value,
): PurchaseStatus {
  const q = new Prisma.Decimal(qty);
  if (q.lte(0)) return 'belum';
  return q.gte(volume) ? 'lengkap' : 'sebagian';
}

/** Sama dengan trigger `purchase_line_validate_set_subtotal`: ROUND(quantity × unit_price). */
export function lineSubtotal(quantity: number, unitPrice: number): bigint {
  return BigInt(
    new Prisma.Decimal(quantity)
      .mul(unitPrice)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      .toFixed(0),
  );
}

const rupiah = (n: bigint) => `Rp${n.toLocaleString('id-ID')}`;

/**
 * Pola A FR-FIN-3: Σ jumlah > volume, atau Σ nominal > material_price × volume.
 * Dipakai saat menyimpan nota DAN saat volume/harga material item diturunkan.
 */
export function purchaseLimitWarnings(
  node: {
    id: string;
    name: string;
    unit: string | null;
    volume: Prisma.Decimal | null;
    materialPrice: bigint | null;
  },
  qty: Prisma.Decimal,
  amount: bigint,
): ApiWarningDto[] {
  const warnings: ApiWarningDto[] = [];
  const volume = node.volume ?? new Prisma.Decimal(0); // item selalu bervolume (CHECK DB)
  const unit = node.unit ?? '';
  if (qty.gt(volume)) {
    warnings.push({
      code: 'PURCHASE_QTY_EXCEEDS_VOLUME',
      message: `${node.name}: jumlah dibeli ${qty.toString()} ${unit} melebihi volume RAB ${volume.toString()} ${unit}`,
      ref: node.id,
    });
  }
  const budget = BigInt(
    volume
      .mul((node.materialPrice ?? 0n).toString())
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      .toFixed(0),
  );
  if (amount > budget) {
    warnings.push({
      code: 'PURCHASE_AMOUNT_EXCEEDS_MATERIAL_BUDGET',
      message: `${node.name}: nominal pembelian ${rupiah(amount)} melebihi anggaran material ${rupiah(budget)}`,
      ref: node.id,
    });
  }
  return warnings;
}
