// acme-backend/src/termins/termins.service.ts
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Termin } from '@prisma/client';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { assertActiveProject, softDelete } from '../trash/soft-delete';
import { CreateTerminDto } from './dto/create-termin.dto';
import { QueryTerminsDto } from './dto/query-termins.dto';
import { UpdateTerminDto } from './dto/update-termin.dto';
import { deriveTerminStatus, jakartaToday, ppnOf } from './termin-status.util';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

type TerminWithProject = Termin & {
  project: { ppnEnabled: boolean; ppnRate: Prisma.Decimal };
  payments: { amount: bigint; paymentDate: Date }[];
};

/** Termin + project (tarif PPN) + pembayaran aktif; dasar semua response termin. */
const WITH_DERIVED = {
  project: { select: { ppnEnabled: true, ppnRate: true } },
  payments: {
    where: { deletedAt: null },
    select: { amount: true, paymentDate: true },
  },
} satisfies Prisma.TerminInclude;

/** Bentuk response termin — `amount` (`bigint`) jadi `number`; status/sisa/PPN diturunkan (FR-FIN-1/6). */
export type TerminResponse = Omit<Termin, 'amount'> & {
  amount: number;
  totalPaid: number;
  remaining: number;
  ppnAmount: number;
  totalWithPpn: number;
};

function derive(t: TerminWithProject) {
  const amount = Number(t.amount);
  const totalPaid = t.payments.reduce((n, p) => n + Number(p.amount), 0);
  const dueDate = t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null;
  const status = deriveTerminStatus(
    { amount, paid: totalPaid, dueDate },
    jakartaToday(),
  );
  const lastPayment = t.payments.reduce<Date | null>(
    (d, p) => (d === null || p.paymentDate > d ? p.paymentDate : d),
    null,
  );
  return {
    status,
    totalPaid,
    paidDate: status === 'Lunas' ? lastPayment : null,
    amount,
  };
}

function toResponse(t: TerminWithProject): TerminResponse {
  const { project, payments, ...termin } = t;
  void payments;
  const d = derive(t);
  const ppnAmount = project.ppnEnabled
    ? ppnOf(d.amount, Number(project.ppnRate))
    : 0;
  return {
    ...termin,
    ...d,
    remaining: Math.max(0, d.amount - d.totalPaid),
    ppnAmount,
    totalWithPpn: d.amount + ppnAmount,
  };
}

/**
 * `termins` — WP-17 (fase-2-keuangan-operasional.md §4). CRUD murni per
 * proyek; route per-item ITEM-SCOPED (`/termins/:id`), `projectId` diambil
 * lewat baris itu sendiri (fase-1 §2.5, disamakan fase-2). Otorisasi murni
 * `@Roles('pimpinan','admin')` di controller — TAK ADA aturan bergantung
 * state di sini, jadi TAK ADA pemanggilan `PolicyService`.
 */
@Injectable()
export class TerminsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    projectId: string,
    query: QueryTerminsDto,
  ): Promise<PaginatedResponse<TerminResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.termin.findMany({
        where: { projectId, deletedAt: null },
        include: WITH_DERIVED,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.termin.count({ where: { projectId, deletedAt: null } }),
    ]);

    return paginate(rows.map(toResponse), { page, perPage, total });
  }

  async create(
    projectId: string,
    dto: CreateTerminDto,
    userId: string,
  ): Promise<TerminResponse> {
    await assertActiveProject(this.prisma, projectId);
    const termin = await this.prisma.termin.create({
      data: {
        projectId,
        name: dto.name,
        type: dto.type,
        amount: BigInt(dto.amount),
        status: 'BelumBayar', // cache; status sebenarnya diturunkan (FR-FIN-1)
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        createdBy: userId,
      },
      include: WITH_DERIVED,
    });
    return toResponse(termin);
  }

  async update(id: string, dto: UpdateTerminDto): Promise<TerminResponse> {
    await this.findOrThrow(id);
    if (dto.amount !== undefined) {
      const agg = await this.prisma.terminPayment.aggregate({
        where: { terminId: id, deletedAt: null },
        _sum: { amount: true },
      });
      const paid = Number(agg._sum.amount ?? 0);
      if (dto.amount < paid) {
        throw new UnprocessableEntityException(
          `Nominal termin tidak boleh kurang dari yang sudah dibayar (Rp ${paid.toLocaleString('id-ID')}).`,
        );
      }
    }

    const termin = await this.prisma.termin.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        amount: dto.amount !== undefined ? BigInt(dto.amount) : undefined,
        dueDate: dto.dueDate !== undefined ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
      },
      include: WITH_DERIVED,
    });
    return this.syncCache(termin);
  }

  async findOne(id: string): Promise<TerminResponse> {
    const termin = await this.prisma.termin.findUnique({
      where: { id, deletedAt: null },
      include: WITH_DERIVED,
    });
    if (!termin) throw new NotFoundException('Termin tidak ditemukan');
    return toResponse(termin);
  }

  /**
   * Tulis ulang kolom cache status/paid_date dari pembayaran (dipanggil setelah
   * mutasi termin/pembayaran) dan kembalikan response. shortcut: cache bisa
   * basi saat lewat jatuh tempo tanpa mutasi; response selalu menghitung ulang —
   * pembaca langsung kolom (dashboard, W1-10) perlu menghitung sendiri.
   */
  async syncCache(t: TerminWithProject): Promise<TerminResponse> {
    const d = derive(t);
    await this.prisma.termin.update({
      where: { id: t.id },
      data: { status: d.status, paidDate: d.paidDate },
    });
    return toResponse({ ...t, status: d.status, paidDate: d.paidDate });
  }

  /** Muat ulang termin dari DB lalu sinkronkan cache. */
  async refresh(id: string): Promise<TerminResponse> {
    const termin = await this.prisma.termin.findUniqueOrThrow({
      where: { id },
      include: WITH_DERIVED,
    });
    return this.syncCache(termin);
  }

  /** Pembayarannya ikut tersembunyi (FR-DEL-3). */
  async remove(id: string, userId: string): Promise<void> {
    await this.findOrThrow(id);
    await softDelete(this.prisma, 'termin', id, userId);
  }

  private async findOrThrow(id: string): Promise<Termin> {
    const termin = await this.prisma.termin.findUnique({
      where: { id, deletedAt: null },
    });
    if (!termin) throw new NotFoundException('Termin tidak ditemukan');
    return termin;
  }
}
