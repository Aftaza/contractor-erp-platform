// acme-backend/src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { SetUserPasswordDto } from './dto/set-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

/**
 * Select eksplisit TANPA `passwordHash` — satu-satunya cara yang benar
 * mencegah hash bocor ke response (fase-2 §4 WP-10). Query Prisma sendiri
 * tak pernah mengembalikan kolom itu, bukan cuma DTO yang kebetulan tak
 * mendeklarasikannya.
 */
const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * `users` — WP-10 (fase-2 §4). Hashing password SELALU lewat
 * `AuthService.hashPassword` (satu-satunya tempat parameter argon2id
 * ditetapkan, src/auth/auth.service.ts) — jangan panggil `argon2.hash`
 * sendiri di sini.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(
    query: QueryUsersDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        select: USER_SELECT,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return paginate(rows, { page, perPage, total });
  }

  async findOne(id: string): Promise<UserResponseDto> {
    return this.findOrThrow(id);
  }

  /** User baru selalu lahir `mustChangePassword: true` (default skema — master §10). */
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await this.authService.hashPassword(dto.password);
    return this.prisma.user.create({
      select: USER_SELECT,
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const before = await this.findOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      select: USER_SELECT,
      data: dto,
    });
    // SEC-4: ganti role atau nonaktif → semua sesi lama dicabut.
    if (
      updated.role !== before.role ||
      (before.isActive && !updated.isActive)
    ) {
      await this.authService.revokeSessions(id);
    }
    return updated;
  }

  /** `PATCH /users/:id/password` — juga men-set `mustChangePassword: true` (fase-2 §4 WP-10). */
  async setPassword(
    id: string,
    dto: SetUserPasswordDto,
  ): Promise<UserResponseDto> {
    await this.findOrThrow(id);
    const passwordHash = await this.authService.hashPassword(dto.newPassword);
    const updated = await this.prisma.user.update({
      where: { id },
      select: USER_SELECT,
      data: { passwordHash, mustChangePassword: true },
    });
    await this.authService.revokeSessions(id); // SEC-4
    return updated;
  }

  /** `PATCH /users/:id/unlock` — FR-AUTH-5: pimpinan membuka kunci login lebih cepat. */
  async unlock(id: string): Promise<UserResponseDto> {
    await this.findOrThrow(id);
    return this.prisma.user.update({
      where: { id },
      select: USER_SELECT,
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  /**
   * Soft-delete: `isActive: false`, BUKAN hapus baris (fase-2 §4 WP-10 —
   * `audit_logs.user_id` & `projects.created_by` merujuk ke sini).
   * `AuthVerifierService` yang sudah ada sudah menolak user `isActive=false`,
   * jadi efeknya setara "dihapus" tanpa merusak riwayat.
   */
  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    await this.authService.revokeSessions(id); // SEC-4
  }

  private async findOrThrow(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }
}
