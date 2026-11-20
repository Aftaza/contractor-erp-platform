// acme-backend/src/vendors/vendors.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Vendor } from '@prisma/client';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { QueryVendorsDto } from './dto/query-vendors.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

/**
 * `vendors` — WP-12 (fase-2 §4). FK `rab_nodes.vendor_id` &
 * `expenses.vendor_id` memakai `onDelete: SetNull` di skema (sudah benar) —
 * menghapus vendor TIDAK menghapus baris yang memakainya, dan TIDAK ada
 * guard aplikasi tambahan yang menolak delete kalau masih terpakai (YAGNI,
 * fase-2 §4 WP-12: "belum ada yang memintanya").
 */
@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryVendorsDto): Promise<PaginatedResponse<Vendor>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendor.count({ where: { deletedAt: null } }),
    ]);

    return paginate(rows, { page, perPage, total });
  }

  async findOne(id: string): Promise<Vendor> {
    return this.findOrThrow(id);
  }

  /** `createdBy` dari user pemanggil — BUKAN dari body (fase-2 §4 WP-12). */
  async create(dto: CreateVendorDto, userId: string): Promise<Vendor> {
    return this.prisma.vendor.create({
      data: { ...dto, createdBy: userId },
    });
  }

  async update(id: string, dto: UpdateVendorDto): Promise<Vendor> {
    await this.findOrThrow(id);
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOrThrow(id);
    await softDelete(this.prisma, 'vendor', id, userId);
  }

  private async findOrThrow(id: string): Promise<Vendor> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id, deletedAt: null },
    });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');
    return vendor;
  }
}
