import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TerminPayment } from '@prisma/client';
import { assertReceiptDocument } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { restoreDeleted, softDelete } from '../trash/soft-delete';
import {
  CreateTerminPaymentDto,
  UpdateTerminPaymentDto,
} from './dto/termin-payment.dto';
import { TerminResponse, TerminsService } from './termins.service';

export type TerminPaymentResponse = Omit<TerminPayment, 'amount'> & {
  amount: number;
};

const toResponse = (p: TerminPayment): TerminPaymentResponse => ({
  ...p,
  amount: Number(p.amount),
});

/** Pembayaran termin (FR-FIN-1): cicilan, kelebihan bayar ditolak, hapus = soft delete. */
@Injectable()
export class TerminPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly termins: TerminsService,
  ) {}

  async findAll(terminId: string): Promise<TerminPaymentResponse[]> {
    await this.activeTermin(terminId);
    const rows = await this.prisma.terminPayment.findMany({
      where: { terminId, deletedAt: null },
      orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toResponse);
  }

  async create(
    terminId: string,
    dto: CreateTerminPaymentDto,
    userId: string,
  ): Promise<TerminResponse> {
    const termin = await this.activeTermin(terminId);
    if (dto.receiptDocumentId) {
      await assertReceiptDocument(
        this.prisma,
        dto.receiptDocumentId,
        termin.projectId,
      );
    }
    await this.assertNotOverpaid(terminId, Number(termin.amount), dto.amount);
    await this.prisma.terminPayment.create({
      data: {
        terminId,
        paymentDate: new Date(dto.paymentDate),
        amount: BigInt(dto.amount),
        receiptDocumentId: dto.receiptDocumentId,
        notes: dto.notes,
        recordedBy: userId,
      },
    });
    return this.termins.refresh(terminId);
  }

  async update(
    id: string,
    dto: UpdateTerminPaymentDto,
  ): Promise<TerminResponse> {
    const payment = await this.activePayment(id);
    const termin = await this.activeTermin(payment.terminId);
    if (dto.receiptDocumentId) {
      await assertReceiptDocument(
        this.prisma,
        dto.receiptDocumentId,
        termin.projectId,
      );
    }
    if (dto.amount !== undefined) {
      await this.assertNotOverpaid(
        payment.terminId,
        Number(termin.amount),
        dto.amount,
        id,
      );
    }
    await this.prisma.terminPayment.update({
      where: { id },
      data: {
        paymentDate:
          dto.paymentDate !== undefined ? new Date(dto.paymentDate) : undefined,
        amount: dto.amount !== undefined ? BigInt(dto.amount) : undefined,
        receiptDocumentId: dto.receiptDocumentId,
        notes: dto.notes,
      },
    });
    return this.termins.refresh(payment.terminId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const payment = await this.activePayment(id);
    await softDelete(this.prisma, 'termin_payment', id, userId);
    await this.termins.refresh(payment.terminId);
  }

  /** Pulihkan dari Tempat Sampah (FR-DEL-6): termin harus aktif & tak boleh jadi kelebihan bayar. */
  async restore(id: string): Promise<void> {
    const payment = await this.prisma.terminPayment.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!payment)
      throw new NotFoundException('Data tidak ada di Tempat Sampah');
    const termin = await this.prisma.termin.findFirst({
      where: { id: payment.terminId, deletedAt: null },
    });
    if (!termin) {
      throw new ConflictException(
        'Induk data ini masih terhapus — pulihkan induknya lebih dulu',
      );
    }
    await this.assertNotOverpaid(
      termin.id,
      Number(termin.amount),
      Number(payment.amount),
    );
    await restoreDeleted(this.prisma, 'termin_payment', id);
    await this.termins.refresh(termin.id);
  }

  /**
   * shortcut: cek-lalu-tulis tanpa kunci baris; dua pembayaran serentak ke termin
   * yang sama bisa lolos bersama. Upgrade: SELECT ... FOR UPDATE di $transaction bila
   * pencatat >1 orang serentak jadi nyata.
   */
  private async assertNotOverpaid(
    terminId: string,
    terminAmount: number,
    newAmount: number,
    excludeId?: string,
  ) {
    const agg = await this.prisma.terminPayment.aggregate({
      where: { terminId, deletedAt: null, id: { not: excludeId } },
      _sum: { amount: true },
    });
    const paid = Number(agg._sum.amount ?? 0);
    if (paid + newAmount > terminAmount) {
      throw new UnprocessableEntityException(
        `Pembayaran melebihi nominal termin. Sisa yang boleh dibayar: Rp ${(terminAmount - paid).toLocaleString('id-ID')}.`,
      );
    }
  }

  private async activeTermin(id: string) {
    const termin = await this.prisma.termin.findFirst({
      where: { id, deletedAt: null },
    });
    if (!termin) throw new NotFoundException('Termin tidak ditemukan');
    return termin;
  }

  private async activePayment(id: string) {
    const p = await this.prisma.terminPayment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!p) throw new NotFoundException('Pembayaran tidak ditemukan');
    return p;
  }
}
