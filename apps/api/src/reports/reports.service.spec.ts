// acme-backend/src/reports/reports.service.spec.ts
//
// Unit test (Prisma mock — master §9.1) untuk ReportsService. Mock
// `groupBy`/`aggregate` MENIRU filter Postgres sungguhan (filter di dalam
// mock berdasarkan `args.where` yang benar-benar dikirim service) — supaya
// test ini membuktikan PERILAKU, bukan cuma bentuk pemanggilan. Pembelian
// (Σ baris nota aktif) lewat `$queryRaw` — filternya diuji di db-spec. Test yang
// butuh Postgres nyata (jumlah 3 proyek, `byClient`, `byMonth` 12 elemen,
// §2.5 jumlah query) ada di `reports.db-spec.ts`.
import { ProjectStatus, TerminStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

interface ExpenseFixture {
  projectId: string;
  amount: bigint;
}
interface TerminFixture {
  projectId: string;
  amount: bigint;
  status: TerminStatus;
}
interface ProjectFixture {
  id: string;
  name: string;
  status: ProjectStatus;
  contractValue: bigint | null;
  clientId: string | null;
  client: { name: string } | null;
  progress?: number;
}

function sumByProject(rows: { projectId: string; amount: bigint }[]) {
  const map = new Map<string, bigint>();
  for (const r of rows)
    map.set(r.projectId, (map.get(r.projectId) ?? 0n) + r.amount);
  return map;
}

function makePrismaMock(fixtures: {
  projects?: ProjectFixture[];
  /** Hasil query Σ baris nota aktif per proyek (sudah difilter SQL). */
  purchases?: { projectId: string; total: bigint }[];
  expenses?: ExpenseFixture[];
  termins?: TerminFixture[];
}) {
  const projects = fixtures.projects ?? [];
  const expenses = fixtures.expenses ?? [];
  const termins = fixtures.termins ?? [];

  return {
    project: {
      findMany: jest.fn().mockResolvedValue(projects),
      count: jest.fn().mockResolvedValue(projects.length),
    },
    expense: {
      groupBy: jest.fn((args: { where: { projectId: { in: string[] } } }) => {
        const ids = args.where.projectId.in;
        const matched = expenses.filter((e) => ids.includes(e.projectId));
        const map = sumByProject(matched);
        return Promise.resolve(
          Array.from(map.entries()).map(([projectId, sum]) => ({
            projectId,
            _sum: { amount: sum },
          })),
        );
      }),
    },
    termin: {
      groupBy: jest.fn(
        (args: {
          where: { projectId: { in: string[] }; status: TerminStatus };
        }) => {
          const ids = args.where.projectId.in;
          const matched = termins.filter(
            (t) => ids.includes(t.projectId) && t.status === args.where.status,
          );
          const map = sumByProject(matched);
          return Promise.resolve(
            Array.from(map.entries()).map(([projectId, sum]) => ({
              projectId,
              _sum: { amount: sum },
            })),
          );
        },
      ),
      aggregate: jest.fn().mockImplementation(() => {
        const sum = termins.reduce((acc, t) => acc + t.amount, 0n);
        return Promise.resolve({ _sum: { amount: sum } });
      }),
    },
    // Panggilan pertama = pembelian per proyek (moneyByProject); sisanya byMonth.
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce(fixtures.purchases ?? [])
      .mockResolvedValue([]),
  };
}

describe('ReportsService', () => {
  it('nol proyek -> semua 0, bukan NaN/null (finance)', async () => {
    const prisma = makePrismaMock({});
    const service = new ReportsService(prisma as unknown as PrismaService);

    const result = await service.finance();

    expect(result.summary).toEqual({
      contractTotal: 0,
      terminTotal: 0,
      paidTotal: 0,
      purchasedTotal: 0,
      expensesTotal: 0,
      realisasiBiaya: 0,
      profit: 0,
      activeProjects: 0,
    });
    expect(result.byClient).toEqual([]);
    expect(result.byMonth).toHaveLength(12);
    for (const m of result.byMonth) {
      expect(m.income).toBe(0);
      expect(m.expense).toBe(0);
      expect(m.profit).toBe(0);
      expect(Number.isNaN(m.income)).toBe(false);
    }
  });

  it('satu proyek tanpa termin/expense -> realisasiBiaya & profit 0 (projects)', async () => {
    const prisma = makePrismaMock({
      projects: [
        {
          id: 'p1',
          name: 'Proyek Sepi',
          status: ProjectStatus.Aktif,
          contractValue: 100_000_000n,
          clientId: null,
          client: null,
        },
      ],
    });
    const service = new ReportsService(prisma as unknown as PrismaService);

    const result = await service.projects({});

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      projectId: 'p1',
      clientName: null,
      paidTotal: 0,
      realisasiBiaya: 0,
      profit: 0,
    });
  });

  it('contractValue NULL tak membuat 500 -> diperlakukan null di baris, tak melempar', async () => {
    const prisma = makePrismaMock({
      projects: [
        {
          id: 'p1',
          name: 'Proyek Tanpa Kontrak',
          status: ProjectStatus.Aktif,
          contractValue: null,
          clientId: null,
          client: null,
        },
      ],
    });
    const service = new ReportsService(prisma as unknown as PrismaService);

    const result = await service.projects({});

    expect(result.data[0].contractValue).toBeNull();
    expect(result.data[0].realisasiBiaya).toBe(0);
  });

  it('pembelian = Σ baris nota per proyek dari query, dijumlah dengan pengeluaran', async () => {
    const prisma = makePrismaMock({
      projects: [
        {
          id: 'p1',
          name: 'Proyek Beli',
          status: ProjectStatus.Aktif,
          contractValue: 1_000_000_000n,
          clientId: null,
          client: null,
        },
      ],
      purchases: [{ projectId: 'p1', total: 200_000_000n }],
      expenses: [{ projectId: 'p1', amount: 5_000_000n }],
    });
    const service = new ReportsService(prisma as unknown as PrismaService);

    const result = await service.projects({});

    expect(result.data[0].realisasiBiaya).toBe(205_000_000);
  });

  it('profit = paidTotal - realisasiBiaya pada campuran termin Lunas & Belum Bayar', async () => {
    const prisma = makePrismaMock({
      projects: [
        {
          id: 'p1',
          name: 'Proyek Campuran',
          status: ProjectStatus.Aktif,
          contractValue: 1_000_000_000n,
          clientId: null,
          client: null,
        },
      ],
      termins: [
        { projectId: 'p1', amount: 300_000_000n, status: TerminStatus.Lunas },
        {
          projectId: 'p1',
          amount: 500_000_000n,
          status: TerminStatus.BelumBayar,
        },
      ],
      expenses: [{ projectId: 'p1', amount: 50_000_000n }],
    });
    const service = new ReportsService(prisma as unknown as PrismaService);

    const result = await service.projects({});

    // paidTotal hanya termin Lunas (300jt), BUKAN 800jt (Lunas+BelumBayar).
    expect(result.data[0].paidTotal).toBe(300_000_000);
    expect(result.data[0].realisasiBiaya).toBe(50_000_000);
    expect(result.data[0].profit).toBe(300_000_000 - 50_000_000);
  });

  it('progress dibaca apa adanya dari kolom cache, contractValue null diperlakukan null (progress)', async () => {
    const prisma = makePrismaMock({
      projects: [
        {
          id: 'p1',
          name: 'Proyek Progress',
          status: ProjectStatus.Aktif,
          contractValue: null,
          clientId: null,
          client: null,
          progress: 42,
        },
      ],
    });
    const service = new ReportsService(prisma as unknown as PrismaService);

    const result = await service.progress({});

    expect(result.data[0]).toMatchObject({
      projectId: 'p1',
      progress: 42,
      contractValue: null,
    });
  });
});
