// acme-backend/src/expenses/expenses.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Expense, Prisma } from '@prisma/client';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { assertReceiptDocument } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertActiveProject, softDelete } from '../trash/soft-delete';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import {
  calculateFinanceSummary,
  FinanceSummary,
} from './finance-summary.util';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

/** Bentuk response expense — `amount` (`bigint`) jadi `number` (pola sama `projects`/`termins`). */
export type ExpenseResponse = Omit<Expense, 'amount'> & { amount: number };

function toResponse(expense: Expense): ExpenseResponse {
  return { ...expense, amount: Number(expense.amount) };
}

/**
 * `expenses` + ringkasan keuangan proyek — WP-17 (fase-2 §4, jalur kritis).
 * CRUD murni per proyek, route per-item item-scoped (`/expenses/:id`, fase-1
 * §2.5). `amount` punya CHECK (amount > 0) di DB — DTO menegakkannya JUGA
 * (`@IsPositive`), keduanya bukan salah satu.
 *
 * `financeSummary()` (fase-2 §2.2 batas modul keuangan): membaca Σ
 * `purchase_lines.subtotal` LANGSUNG lewat Prisma (FR-FIN-3). Total RAB
 * SENGAJA tak ada di sini — itu `GET /projects/:id/rab/summary`, modul lain.
 */
@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    projectId: string,
    query: QueryExpensesDto,
  ): Promise<PaginatedResponse<ExpenseResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: { projectId, deletedAt: null },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.expense.count({ where: { projectId, deletedAt: null } }),
    ]);

    return paginate(rows.map(toResponse), { page, perPage, total });
  }

  async create(
    projectId: string,
    dto: CreateExpenseDto,
    userId: string,
  ): Promise<ExpenseResponse> {
    await assertActiveProject(this.prisma, projectId);
    await this.assertActiveVendor(dto.vendorId);
    if (dto.receiptDocumentId) {
      await assertReceiptDocument(
        this.prisma,
        dto.receiptDocumentId,
        projectId,
      );
    }
    const expense = await this.prisma.expense
      .create({
        data: {
          projectId,
          description: dto.description,
          amount: BigInt(dto.amount),
          expenseDate: new Date(dto.expenseDate),
          category: dto.category,
          vendorId: dto.vendorId,
          receiptUrl: dto.receiptUrl,
          receiptDocumentId: dto.receiptDocumentId,
          notes: dto.notes,
          recordedBy: userId,
        },
      })
      .catch((err: unknown) => this.rethrowKnownError(err));
    return toResponse(expense);
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<ExpenseResponse> {
    const current = await this.findOrThrow(id);
    await this.assertActiveVendor(dto.vendorId);
    if (dto.receiptDocumentId) {
      await assertReceiptDocument(
        this.prisma,
        dto.receiptDocumentId,
        current.projectId,
      );
    }

    const expense = await this.prisma.expense
      .update({
        where: { id },
        data: {
          description: dto.description,
          amount: dto.amount !== undefined ? BigInt(dto.amount) : undefined,
          expenseDate:
            dto.expenseDate !== undefined
              ? new Date(dto.expenseDate)
              : undefined,
          category: dto.category,
          vendorId: dto.vendorId,
          receiptUrl: dto.receiptUrl,
          receiptDocumentId: dto.receiptDocumentId,
          notes: dto.notes,
        },
      })
      .catch((err: unknown) => this.rethrowKnownError(err));
    return toResponse(expense);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOrThrow(id);
    await softDelete(this.prisma, 'expense', id, userId);
  }

  /**
   * `GET /projects/:id/finance/summary`. `purchasedAmount` = Σ subtotal baris
   * nota pembelian aktif (FR-FIN-3, R-001) — kolom lama `rab_nodes.purchased_*`
   * tak dibaca lagi, jadi data hasil migrasi tak terhitung dua kali.
   * shortcut: ringkasan dua blok anggaran & kas (FR-FIN-4) milik W1-06.
   */
  async financeSummary(projectId: string): Promise<FinanceSummary> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
      select: { contractValue: true },
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan');

    const [purchasedAgg, expensesAgg] = await Promise.all([
      this.prisma.purchaseLine.aggregate({
        where: {
          deletedAt: null,
          purchaseNote: { projectId, deletedAt: null },
        },
        _sum: { subtotal: true },
      }),
      this.prisma.expense.aggregate({
        where: { projectId, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    return calculateFinanceSummary(
      project.contractValue === null ? null : Number(project.contractValue),
      Number(purchasedAgg._sum.subtotal ?? 0n),
      Number(expensesAgg._sum.amount ?? 0n),
    );
  }

  private async findOrThrow(id: string): Promise<Expense> {
    const expense = await this.prisma.expense.findUnique({
      where: { id, deletedAt: null },
    });
    if (!expense) throw new NotFoundException('Pengeluaran tidak ditemukan');
    return expense;
  }

  /**
   * `vendor_id` tak dikenal → FK violation (P2003) → 400 tervalidasi (pola
   * sama `projects.service.ts`). `amount <= 0` yang lolos DTO (tak mungkin
   * lewat `@IsPositive`, tapi jaring kedua) → CHECK `expenses_amount_positive`
   * → 400 juga, bukan 500 generik.
   *
   * Terverifikasi empiris (db-spec): pelanggaran CHECK Postgres pada versi
   * Prisma ini TAK muncul sebagai `PrismaClientKnownRequestError` kode P2004
   * seperti yang didokumentasikan — ia jatuh ke
   * `PrismaClientUnknownRequestError` dengan pesan mentah Postgres (kode SQL
   * `23514`) di dalamnya. Dicocokkan lewat `.message`, bukan `.code`.
   */
  /** Vendor terhapus tetap tampil di data lama, tapi tak bisa dipilih untuk data baru (FR-DEL-4). */
  private async assertActiveVendor(vendorId?: string): Promise<void> {
    if (
      vendorId &&
      !(await this.prisma.vendor.count({
        where: { id: vendorId, deletedAt: null },
      }))
    ) {
      throw new BadRequestException('vendorId tidak ditemukan');
    }
  }

  private rethrowKnownError(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2003') {
        throw new BadRequestException('vendorId tidak ditemukan');
      }
      if (err.code === 'P2004') {
        throw new BadRequestException('amount harus lebih besar dari 0');
      }
    }
    if (
      err instanceof Prisma.PrismaClientUnknownRequestError &&
      err.message.includes('expenses_amount_positive')
    ) {
      throw new BadRequestException('amount harus lebih besar dari 0');
    }
    throw err;
  }
}
