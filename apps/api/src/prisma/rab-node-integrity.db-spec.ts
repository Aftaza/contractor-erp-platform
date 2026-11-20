// Test integrasi (Postgres nyata) untuk CHECK integritas
// `rab_nodes_item_vs_group_fields` (WP-02, master §4.3):
// - node_type='item' wajib volume+unit dan minimal satu harga.
// - node grup (section/subgroup/phase) DILARANG punya field harga/progress/
//   pembelian.
//
// Catatan: Prisma membungkus pelanggaran CHECK (SQLSTATE 23514) sebagai
// PrismaClientUnknownRequestError, bukan KnownRequestError. Assertion karena
// itu menyebut NAMA CONSTRAINT-nya langsung — lebih ketat: membuktikan
// constraint yang tepat yang menolak, bukan sekadar "ada error apa pun".
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('CHECK integritas rab_nodes (item vs grup)', () => {
  let projectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: {
        name: 'WP-02 test — integritas',
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('MENOLAK node grup (section) yang diberi material_price', async () => {
    await expect(
      prisma.rabNode.create({
        data: {
          projectId,
          nodeType: 'section',
          name: 'Bad Section',
          materialPrice: 1000n,
        },
      }),
    ).rejects.toThrow(/rab_nodes_item_vs_group_fields/);
  });

  it('MENOLAK node grup (subgroup) yang diberi progress_percent > 0', async () => {
    await expect(
      prisma.rabNode.create({
        data: {
          projectId,
          nodeType: 'subgroup',
          name: 'Bad Subgroup',
          progressPercent: 10,
        },
      }),
    ).rejects.toThrow(/rab_nodes_item_vs_group_fields/);
  });

  it('MENOLAK node grup (phase) yang diberi purchased_amount', async () => {
    await expect(
      prisma.rabNode.create({
        data: {
          projectId,
          nodeType: 'phase',
          name: 'Bad Phase',
          purchasedAmount: 5000n,
        },
      }),
    ).rejects.toThrow(/rab_nodes_item_vs_group_fields/);
  });

  it('MENOLAK item tanpa volume/unit', async () => {
    await expect(
      prisma.rabNode.create({
        data: {
          projectId,
          nodeType: 'item',
          name: 'Item tanpa volume',
          materialPrice: 1000n,
        },
      }),
    ).rejects.toThrow(/rab_nodes_item_vs_group_fields/);
  });

  it('MENOLAK item tanpa harga sama sekali (material maupun labor)', async () => {
    await expect(
      prisma.rabNode.create({
        data: {
          projectId,
          nodeType: 'item',
          name: 'Item tanpa harga',
          volume: 1,
          unit: 'EA',
        },
      }),
    ).rejects.toThrow(/rab_nodes_item_vs_group_fields/);
  });

  it('MENOLAK progress_percent di luar 0..100', async () => {
    await expect(
      prisma.rabNode.create({
        data: {
          projectId,
          nodeType: 'item',
          name: 'Item progress invalid',
          volume: 1,
          unit: 'EA',
          materialPrice: 1000n,
          progressPercent: 150,
        },
      }),
    ).rejects.toThrow(/rab_nodes_progress_percent_range/);
  });

  it('MENERIMA node grup polos (tanpa field harga/progress)', async () => {
    const node = await prisma.rabNode.create({
      data: { projectId, nodeType: 'phase', name: 'Footing F1' },
    });
    expect(node.id).toBeDefined();
  });

  it('MENERIMA item lengkap (volume+unit+harga)', async () => {
    const node = await prisma.rabNode.create({
      data: {
        projectId,
        nodeType: 'item',
        name: 'Item valid',
        volume: 2,
        unit: 'M2',
        laborPrice: 25000n,
      },
    });
    expect(node.total).toBe(50000n);
  });
});

describe('CHECK numerik expenses.amount > 0', () => {
  let projectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: {
        name: 'WP-02 test — expenses check',
        location: 'Surabaya',
        contractType: 'one_time',
        status: 'Aktif',
        startDate: new Date('2026-01-01'),
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.project.delete({ where: { id: projectId } });
  });

  it('MENOLAK amount = 0', async () => {
    await expect(
      prisma.expense.create({
        data: {
          projectId,
          description: 'Belanja nol',
          amount: 0n,
          expenseDate: new Date('2026-01-02'),
          category: 'material',
        },
      }),
    ).rejects.toThrow(/expenses_amount_positive/);
  });

  it('MENOLAK amount negatif', async () => {
    await expect(
      prisma.expense.create({
        data: {
          projectId,
          description: 'Belanja negatif',
          amount: -1000n,
          expenseDate: new Date('2026-01-02'),
          category: 'material',
        },
      }),
    ).rejects.toThrow(/expenses_amount_positive/);
  });

  it('MENERIMA amount positif', async () => {
    const expense = await prisma.expense.create({
      data: {
        projectId,
        description: 'Belanja valid',
        amount: 50000n,
        expenseDate: new Date('2026-01-02'),
        category: 'material',
      },
    });
    expect(expense.amount).toBe(50000n);
  });
});
