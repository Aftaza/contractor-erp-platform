// Unit (Prisma mock): peringatan pola A & validasi baris nota (FR-FIN-3,
// FR-NTF-7). Trigger, subtotal DB, migrasi data & alur HTTP ada di
// purchase.db-spec.ts.
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NodeType, Prisma } from '@prisma/client';
import { WarningsException } from '../common/warnings';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseService } from './purchase.service';
import { lineSubtotal, purchaseStatus } from './purchase-totals';

const PROJECT = 'aaaaaaaa-0000-4000-8000-000000000001';
const ITEM = 'cccccccc-0000-4000-8000-000000000003';
const USER = 'dddddddd-0000-4000-8000-000000000004';

function makePrisma(prev: { qty: string; amount: bigint } | null = null) {
  return {
    project: { count: jest.fn().mockResolvedValue(1) },
    vendor: { count: jest.fn().mockResolvedValue(1) },
    rabNode: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: ITEM,
          name: 'Besi',
          unit: 'kg',
          nodeType: NodeType.item,
          volume: new Prisma.Decimal(10),
          materialPrice: 1000n,
        },
      ]),
    },
    $queryRaw: jest.fn().mockResolvedValue(
      prev
        ? [
            {
              id: ITEM,
              qty: new Prisma.Decimal(prev.qty),
              amount: prev.amount,
              vendors: 1n,
            },
          ]
        : [],
    ),
    purchaseNote: {
      create: jest.fn().mockResolvedValue({ lines: [{ subtotal: 5000n }] }),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({ lines: [] }),
    },
  };
}

const dto = (quantity: number, unitPrice: number, ack?: boolean) => ({
  noteDate: '2026-11-01',
  lines: [{ rabNodeId: ITEM, quantity, unitPrice }],
  acknowledgeWarnings: ack,
});

async function warningCodes(p: Promise<unknown>): Promise<string[]> {
  const err: unknown = await p.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(WarningsException);
  return (err as WarningsException).warnings.map((w) => w.code);
}

describe('PurchaseService', () => {
  it('dalam volume & anggaran → tersimpan tanpa peringatan, total = Σ subtotal', async () => {
    const prisma = makePrisma();
    const service = new PurchaseService(prisma as unknown as PrismaService);
    const note = await service.create(PROJECT, dto(5, 1000), USER);
    expect(note.total).toBe(5000n);
    expect(prisma.purchaseNote.create).toHaveBeenCalled();
  });

  it('Σ jumlah (lama + baru) > volume → 422, tak menyimpan', async () => {
    const prisma = makePrisma({ qty: '8', amount: 8000n });
    const service = new PurchaseService(prisma as unknown as PrismaService);
    expect(
      await warningCodes(service.create(PROJECT, dto(3, 500), USER)),
    ).toEqual(['PURCHASE_QTY_EXCEEDS_VOLUME']);
    expect(prisma.purchaseNote.create).not.toHaveBeenCalled();
  });

  it('Σ nominal > material_price × volume → 422 anggaran material', async () => {
    const prisma = makePrisma();
    const service = new PurchaseService(prisma as unknown as PrismaService);
    expect(
      await warningCodes(service.create(PROJECT, dto(2, 6000), USER)),
    ).toEqual(['PURCHASE_AMOUNT_EXCEEDS_MATERIAL_BUDGET']);
  });

  it('acknowledgeWarnings: true → tetap tersimpan', async () => {
    const prisma = makePrisma({ qty: '8', amount: 8000n });
    const service = new PurchaseService(prisma as unknown as PrismaService);
    await service.create(PROJECT, dto(3, 5000, true), USER);
    expect(prisma.purchaseNote.create).toHaveBeenCalled();
  });

  it('edit nota: baris nota itu sendiri dikecualikan dari agregat', async () => {
    const prisma = makePrisma();
    prisma.purchaseNote.findFirst.mockResolvedValue({
      id: 'n1',
      projectId: PROJECT,
      lines: [],
    });
    const service = new PurchaseService(prisma as unknown as PrismaService);
    await service.update('n1', dto(10, 1000), USER);
    const sql = prisma.$queryRaw.mock.calls[0] as unknown[];
    expect(sql).toContain('n1');
  });

  it('edit nota: lines.id yang bukan baris aktif nota itu → 400', async () => {
    const prisma = makePrisma();
    prisma.purchaseNote.findFirst.mockResolvedValue({
      id: 'n1',
      projectId: PROJECT,
      lines: [],
    });
    const service = new PurchaseService(prisma as unknown as PrismaService);
    await expect(
      service.update(
        'n1',
        { lines: [{ id: ITEM, rabNodeId: ITEM, quantity: 1, unitPrice: 1 }] },
        USER,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.purchaseNote.update).not.toHaveBeenCalled();
  });

  it('edit nota: lines.id duplikat → 400', async () => {
    const prisma = makePrisma();
    prisma.purchaseNote.findFirst.mockResolvedValue({
      id: 'n1',
      projectId: PROJECT,
      lines: [
        {
          id: ITEM,
          rabNodeId: ITEM,
          quantity: new Prisma.Decimal(1),
          unitPrice: 1n,
          notes: null,
        },
      ],
    });
    const service = new PurchaseService(prisma as unknown as PrismaService);
    const line = { id: ITEM, rabNodeId: ITEM, quantity: 1, unitPrice: 1 };
    await expect(
      service.update('n1', { lines: [line, line] }, USER),
    ).rejects.toThrow('duplikat');
    expect(prisma.purchaseNote.update).not.toHaveBeenCalled();
  });

  it('edit nota: baris terhapus di tengah jalan (P2025) → 400', async () => {
    const prisma = makePrisma();
    prisma.purchaseNote.findFirst.mockResolvedValue({
      id: 'n1',
      projectId: PROJECT,
      lines: [
        {
          id: ITEM,
          rabNodeId: ITEM,
          quantity: new Prisma.Decimal(1),
          unitPrice: 1n,
          notes: null,
        },
      ],
    });
    prisma.purchaseNote.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    const service = new PurchaseService(prisma as unknown as PrismaService);
    await expect(
      service.update(
        'n1',
        { lines: [{ id: ITEM, rabNodeId: ITEM, quantity: 2, unitPrice: 1 }] },
        USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('vendor terhapus → 400 (FR-DEL-4)', async () => {
    const prisma = makePrisma();
    prisma.vendor.count.mockResolvedValue(0);
    const service = new PurchaseService(prisma as unknown as PrismaService);
    await expect(
      service.create(PROJECT, { ...dto(1, 1), vendorId: USER }, USER),
    ).rejects.toThrow(BadRequestException);
  });

  it('node bukan item aktif proyek ini → 400', async () => {
    const prisma = makePrisma();
    prisma.rabNode.findMany.mockResolvedValue([]);
    const service = new PurchaseService(prisma as unknown as PrismaService);
    await expect(service.create(PROJECT, dto(1, 1), USER)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('subtotal baris > 10^15 → 400 (bukan overflow bigint 500)', async () => {
    const service = new PurchaseService(
      makePrisma() as unknown as PrismaService,
    );
    await expect(service.create(PROJECT, dto(1e9, 1e15), USER)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('proyek tak ada/terhapus → 404', async () => {
    const prisma = makePrisma();
    prisma.project.count.mockResolvedValue(0);
    const service = new PurchaseService(prisma as unknown as PrismaService);
    await expect(service.create(PROJECT, dto(1, 1), USER)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('purchase-totals', () => {
  it('purchaseStatus: belum / sebagian / lengkap', () => {
    expect(purchaseStatus(0, 10)).toBe('belum');
    expect(purchaseStatus('9.9999', 10)).toBe('sebagian');
    expect(purchaseStatus(10, 10)).toBe('lengkap');
    expect(purchaseStatus(12, 10)).toBe('lengkap');
  });

  it('lineSubtotal = ROUND(qty × harga) seperti trigger DB', () => {
    expect(lineSubtotal(2.5, 14999)).toBe(37498n); // 37497.5 → 37498
    expect(lineSubtotal(0.0001, 1)).toBe(0n);
  });
});
