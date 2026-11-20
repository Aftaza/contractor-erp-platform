// acme-backend/src/reports/reports.service.ts
//
// `reports` — WP-20 (fase-3-pelaporan-publikasi.md §4, §2.3, §2.5). Tiga
// endpoint, semuanya baca-saja. Aturan yang mengikat SELURUH file ini:
//
// 1. `realisasiBiaya` HANYA lewat `calculateFinanceSummary`
//    (`expenses/finance-summary.util.ts`, §2.3) — fungsi murni diIMPOR, TAK
//    diturunkan ulang. `purchasedAmount` = Σ baris nota pembelian aktif
//    (FR-FIN-3, R-001) — kolom lama `rab_nodes.purchased_*` tak dibaca.
// 2. Agregasi lewat `groupBy` / `$queryRaw` bertemplate — JUMLAH QUERY PER
//    ENDPOINT TAK BOLEH TUMBUH SEIRING JUMLAH PROYEK (§2.5). Tak ada
//    `Promise.all` per proyek di file ini.
// 3. `profit = paidTotal − realisasiBiaya` (§2.3) — BUKAN rumus lama
//    `paid − expenses`.
import { Injectable } from '@nestjs/common';
import { ProjectStatus, TerminStatus } from '@prisma/client';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { calculateFinanceSummary } from '../expenses/finance-summary.util';
import { PrismaService } from '../prisma/prisma.service';
import { QueryReportsDto } from './dto/query-reports.dto';
import {
  ReportFinanceByClientDto,
  ReportFinanceByMonthDto,
  ReportFinanceResponseDto,
} from './dto/report-finance-response.dto';
import { ReportProgressRowDto } from './dto/report-progress-response.dto';
import { ReportProjectRowDto } from './dto/report-project-response.dto';
import {
  ReportVendorPriceDto,
  ReportVendorRowDto,
} from './dto/report-vendor-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;
const MONTHS_BACK = 12;
// shortcut: riwayat harga dipotong 20 baris terbaru per vendor, upgrade ke endpoint riwayat berhalaman bila UI butuh lebih.
const PRICE_HISTORY_LIMIT = 20;

interface MoneyByProject {
  purchasedByProject: Map<string, number>;
  expensesByProject: Map<string, number>;
  paidByProject: Map<string, number>;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /reports/projects` — laba-rugi per proyek, halaman per halaman. */
  async projects(
    query: QueryReportsDto,
  ): Promise<PaginatedResponse<ReportProjectRowDto>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          contractValue: true,
          client: { select: { name: true, deletedAt: true } },
        },
      }),
      this.prisma.project.count({ where: { deletedAt: null } }),
    ]);

    const money = await this.moneyByProject(rows.map((r) => r.id));

    const data: ReportProjectRowDto[] = rows.map((p) => {
      const contractValue =
        p.contractValue === null ? null : Number(p.contractValue);
      const purchasedAmount = money.purchasedByProject.get(p.id) ?? 0;
      const expensesAmount = money.expensesByProject.get(p.id) ?? 0;
      const paidTotal = money.paidByProject.get(p.id) ?? 0;
      const { realisasiBiaya } = calculateFinanceSummary(
        contractValue,
        purchasedAmount,
        expensesAmount,
      );
      return {
        projectId: p.id,
        name: p.name,
        clientName: p.client?.name ?? null,
        clientDeleted: !!p.client?.deletedAt,
        status: p.status,
        contractValue,
        paidTotal,
        realisasiBiaya,
        profit: paidTotal - realisasiBiaya,
      };
    });

    return paginate(data, { page, perPage, total });
  }

  /** `GET /reports/progress` — `progress` dibaca dari kolom cache trigger DB, tak dihitung ulang. */
  async progress(
    query: QueryReportsDto,
  ): Promise<PaginatedResponse<ReportProgressRowDto>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          contractValue: true,
        },
      }),
      this.prisma.project.count({ where: { deletedAt: null } }),
    ]);

    const data: ReportProgressRowDto[] = rows.map((p) => ({
      projectId: p.id,
      name: p.name,
      status: p.status,
      progress: Number(p.progress),
      contractValue: p.contractValue === null ? null : Number(p.contractValue),
    }));

    return paginate(data, { page, perPage, total });
  }

  /** `GET /reports/finance` — ringkasan global + per klien + per bulan, satu round-trip (§2.4). */
  async finance(): Promise<ReportFinanceResponseDto> {
    const [projects, terminTotalAgg] = await Promise.all([
      this.prisma.project.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          clientId: true,
          contractValue: true,
          status: true,
          client: { select: { name: true, deletedAt: true } },
        },
      }),
      this.prisma.termin.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    const money = await this.moneyByProject(projects.map((p) => p.id));

    let contractTotal = 0;
    let purchasedTotal = 0;
    let expensesTotal = 0;
    let paidTotal = 0;
    let activeProjects = 0;

    interface ClientAcc {
      clientId: string | null;
      clientName: string;
      clientDeleted: boolean;
      projectCount: number;
      contractTotal: number;
      paidTotal: number;
      realisasiBiaya: number;
    }
    const byClientMap = new Map<string, ClientAcc>();

    for (const p of projects) {
      const contractValue =
        p.contractValue === null ? 0 : Number(p.contractValue);
      const purchasedAmount = money.purchasedByProject.get(p.id) ?? 0;
      const expensesAmount = money.expensesByProject.get(p.id) ?? 0;
      const paid = money.paidByProject.get(p.id) ?? 0;
      const { realisasiBiaya } = calculateFinanceSummary(
        contractValue,
        purchasedAmount,
        expensesAmount,
      );

      contractTotal += contractValue;
      purchasedTotal += purchasedAmount;
      expensesTotal += expensesAmount;
      paidTotal += paid;
      if (p.status === ProjectStatus.Aktif) activeProjects += 1;

      const clientKey = p.clientId ?? '__none__';
      const acc = byClientMap.get(clientKey) ?? {
        clientId: p.clientId,
        clientName: p.client?.name ?? 'Tanpa klien',
        clientDeleted: !!p.client?.deletedAt,
        projectCount: 0,
        contractTotal: 0,
        paidTotal: 0,
        realisasiBiaya: 0,
      };
      acc.projectCount += 1;
      acc.contractTotal += contractValue;
      acc.paidTotal += paid;
      acc.realisasiBiaya += realisasiBiaya;
      byClientMap.set(clientKey, acc);
    }

    const { realisasiBiaya } = calculateFinanceSummary(
      contractTotal,
      purchasedTotal,
      expensesTotal,
    );

    const byClient: ReportFinanceByClientDto[] = Array.from(
      byClientMap.values(),
    ).map((c) => ({
      clientId: c.clientId,
      clientName: c.clientName,
      clientDeleted: c.clientDeleted,
      projectCount: c.projectCount,
      contractTotal: c.contractTotal,
      paidTotal: c.paidTotal,
      realisasiBiaya: c.realisasiBiaya,
      profit: c.paidTotal - c.realisasiBiaya,
    }));

    const byMonth = await this.byMonth();

    return {
      summary: {
        contractTotal,
        terminTotal: Number(terminTotalAgg._sum.amount ?? 0n),
        paidTotal,
        purchasedTotal,
        expensesTotal,
        realisasiBiaya,
        profit: paidTotal - realisasiBiaya,
        activeProjects,
      },
      byClient,
      byMonth,
    };
  }

  /**
   * `GET /reports/vendors` — rekap baris nota aktif (proyek tak terhapus) per vendor (FR-FIN-3).
   * Tiga query tetap (ringkasan, hitungan grup, riwayat) — tak tumbuh per vendor (§2.5).
   */
  async vendors(
    query: QueryReportsDto,
  ): Promise<PaginatedResponse<ReportVendorRowDto>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<
        {
          vendorId: string | null;
          vendorName: string | null;
          noteCount: bigint;
          itemCount: bigint;
          totalAmount: bigint;
        }[]
      >`
        SELECT pn."vendor_id" AS "vendorId", v."name" AS "vendorName",
               COUNT(DISTINCT pn."id") AS "noteCount",
               COUNT(DISTINCT pl."rab_node_id") AS "itemCount",
               SUM(pl."subtotal")::bigint AS "totalAmount"
        FROM "purchase_lines" pl
        JOIN "purchase_notes" pn ON pn."id" = pl."purchase_note_id"
        JOIN "projects" p ON p."id" = pn."project_id"
        LEFT JOIN "vendors" v ON v."id" = pn."vendor_id"
        WHERE pl."deleted_at" IS NULL AND pn."deleted_at" IS NULL AND p."deleted_at" IS NULL
        GROUP BY pn."vendor_id", v."name"
        ORDER BY "totalAmount" DESC, pn."vendor_id"
        LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(DISTINCT pn."vendor_id")
               + MAX(CASE WHEN pn."vendor_id" IS NULL THEN 1 ELSE 0 END) AS total
        FROM "purchase_lines" pl
        JOIN "purchase_notes" pn ON pn."id" = pl."purchase_note_id"
        JOIN "projects" p ON p."id" = pn."project_id"
        WHERE pl."deleted_at" IS NULL AND pn."deleted_at" IS NULL AND p."deleted_at" IS NULL
      `,
    ]);

    const vendorIds = rows.flatMap((r) => (r.vendorId ? [r.vendorId] : []));
    const withoutVendor = rows.some((r) => r.vendorId === null);
    const history = await this.prisma.$queryRaw<
      (ReportVendorPriceDto & { vendorId: string | null })[]
    >`
      SELECT h."vendorId", h."rabNodeId", h."itemName", h."unit", h."projectId",
             h."projectName", h."noteDate", h."quantity", h."unitPrice"
      FROM (
        SELECT pn."vendor_id" AS "vendorId", pl."rab_node_id" AS "rabNodeId",
               rn."name" AS "itemName", rn."unit", p."id" AS "projectId",
               p."name" AS "projectName", pn."note_date" AS "noteDate",
               pl."quantity", pl."unit_price" AS "unitPrice",
               ROW_NUMBER() OVER (
                 PARTITION BY pn."vendor_id"
                 ORDER BY pn."note_date" DESC, pl."created_at" DESC
               ) AS rank
        FROM "purchase_lines" pl
        JOIN "purchase_notes" pn ON pn."id" = pl."purchase_note_id"
        JOIN "rab_nodes" rn ON rn."id" = pl."rab_node_id"
        JOIN "projects" p ON p."id" = pn."project_id"
        WHERE pl."deleted_at" IS NULL AND pn."deleted_at" IS NULL AND p."deleted_at" IS NULL
          AND (pn."vendor_id" = ANY(${vendorIds}::uuid[])
               OR (${withoutVendor} AND pn."vendor_id" IS NULL))
      ) h
      WHERE h.rank <= ${PRICE_HISTORY_LIMIT}
      ORDER BY h."noteDate" DESC
    `;

    const historyByVendor = new Map<string | null, ReportVendorPriceDto[]>();
    for (const { vendorId, ...price } of history) {
      historyByVendor.set(vendorId, [
        ...(historyByVendor.get(vendorId) ?? []),
        price,
      ]);
    }

    const data: ReportVendorRowDto[] = rows.map((r) => ({
      vendorId: r.vendorId,
      vendorName: r.vendorName ?? 'Tanpa vendor',
      noteCount: Number(r.noteCount),
      itemCount: Number(r.itemCount),
      totalAmount: Number(r.totalAmount),
      priceHistory: historyByVendor.get(r.vendorId) ?? [],
    }));
    return paginate(data, { page, perPage, total: Number(total ?? 0n) });
  }

  /**
   * Agregasi uang per proyek — TIGA query agregat, jumlahnya TETAP terlepas dari
   * jumlah proyek (§2.5). `projectIds` kosong → Prisma `in: []` legal,
   * mengembalikan array kosong (bukti kasus "nol proyek" DoD).
   */
  private async moneyByProject(projectIds: string[]): Promise<MoneyByProject> {
    const [purchased, expensesAgg, paid] = await Promise.all([
      this.prisma.$queryRaw<{ projectId: string; total: bigint }[]>`
        SELECT pn."project_id" AS "projectId", SUM(pl."subtotal")::bigint AS total
        FROM "purchase_lines" pl
        JOIN "purchase_notes" pn ON pn."id" = pl."purchase_note_id"
        WHERE pn."project_id" = ANY(${projectIds}::uuid[])
          AND pl."deleted_at" IS NULL AND pn."deleted_at" IS NULL
        GROUP BY 1
      `,
      this.prisma.expense.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds }, deletedAt: null },
        _sum: { amount: true },
      }),
      this.prisma.termin.groupBy({
        by: ['projectId'],
        where: {
          projectId: { in: projectIds },
          status: TerminStatus.Lunas,
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      purchasedByProject: new Map(
        purchased.map((r) => [r.projectId, Number(r.total)]),
      ),
      expensesByProject: new Map(
        expensesAgg.map((r) => [r.projectId, Number(r._sum.amount ?? 0n)]),
      ),
      paidByProject: new Map(
        paid.map((r) => [r.projectId, Number(r._sum.amount ?? 0n)]),
      ),
    };
  }

  /**
   * `byMonth[]` — 12 bulan terakhir (termasuk bulan berjalan), bulan kosong
   * tetap muncul bernilai 0 (§2.4). Dua `$queryRaw` BERTEMPLATE (§2.5) — satu
   * per sumber uang, bukan per bulan/per proyek. `income` dari
   * `termins.paid_date`, `expense` dari `expenses.expense_date` (§4 WP-20).
   */
  private async byMonth(): Promise<ReportFinanceByMonthDto[]> {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_BACK - 1), 1),
    );

    const [incomeRows, expenseRows] = await Promise.all([
      this.prisma.$queryRaw<{ period: string; total: bigint | null }[]>`
        SELECT to_char(date_trunc('month', paid_date), 'YYYY-MM') AS period,
               SUM(amount) AS total
        FROM termins
        WHERE paid_date IS NOT NULL AND paid_date >= ${start} AND deleted_at IS NULL
        GROUP BY 1
      `,
      this.prisma.$queryRaw<{ period: string; total: bigint | null }[]>`
        SELECT to_char(date_trunc('month', expense_date), 'YYYY-MM') AS period,
               SUM(amount) AS total
        FROM expenses
        WHERE expense_date >= ${start} AND deleted_at IS NULL
        GROUP BY 1
      `,
    ]);

    const incomeMap = new Map(
      incomeRows.map((r) => [r.period, Number(r.total ?? 0n)]),
    );
    const expenseMap = new Map(
      expenseRows.map((r) => [r.period, Number(r.total ?? 0n)]),
    );

    const months: ReportFinanceByMonthDto[] = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i -= 1) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const income = incomeMap.get(period) ?? 0;
      const expense = expenseMap.get(period) ?? 0;
      months.push({ period, income, expense, profit: income - expense });
    }
    return months;
  }
}
