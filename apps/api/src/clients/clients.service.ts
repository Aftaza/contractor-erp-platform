// acme-backend/src/clients/clients.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Client } from '@prisma/client';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { softDelete } from '../trash/soft-delete';
import { CreateClientDto } from './dto/create-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

/**
 * `clients` — WP-11 (fase-2 §4). FK `projects.client_id` memakai
 * `onDelete: SetNull` di skema (sudah benar) — menghapus klien TIDAK
 * menghapus proyek, dan TIDAK ada guard aplikasi tambahan yang menolak
 * delete kalau masih terpakai (YAGNI, fase-2 §4 WP-11: "belum ada yang
 * memintanya").
 */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryClientsDto): Promise<PaginatedResponse<Client>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.client.findMany({
        where: { deletedAt: null },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where: { deletedAt: null } }),
    ]);

    return paginate(rows, { page, perPage, total });
  }

  async findOne(id: string): Promise<Client> {
    return this.findOrThrow(id);
  }

  /** `createdBy` dari user pemanggil — BUKAN dari body (fase-2 §4 WP-11). */
  async create(dto: CreateClientDto, userId: string): Promise<Client> {
    return this.prisma.client.create({
      data: { ...dto, createdBy: userId },
    });
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    await this.findOrThrow(id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOrThrow(id);
    await softDelete(this.prisma, 'client', id, userId);
  }

  private async findOrThrow(id: string): Promise<Client> {
    const client = await this.prisma.client.findUnique({
      where: { id, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Klien tidak ditemukan');
    return client;
  }
}
