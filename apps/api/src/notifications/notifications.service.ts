// acme-backend/src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, NotificationType } from '@prisma/client';
import { AppRole } from '../common/decorators/roles.decorator';
import {
  PaginatedResponse,
  paginate,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

export interface NotifyRolePayload {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * `notifications` — WP-19 (fase-2 §4). Scoping "miliknya" ADA DI SINI, BUKAN
 * di matriks — baris `test/authz/rows/notifications.rows.ts` hanya
 * menggambarkan gerbang role (ketiga role lolos `@Roles`). `markRead`
 * menolak **404** (bukan 403) untuk baris milik orang lain — jangan
 * bocorkan keberadaannya.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResponse<Notification>> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return paginate(rows, { page, perPage, total });
  }

  /**
   * `PATCH /notifications/:id/read`. Filter `id + userId` DI QUERY —
   * notifikasi milik orang lain tak pernah ditemukan, jadi 404, bukan 403
   * (fase-2 §4 WP-19: "jangan bocorkan keberadaannya").
   */
  async markRead(id: string, userId: string): Promise<Notification> {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('Notifikasi tidak ditemukan');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Dipanggil `ProjectToolsService` (fase-2 §2.3 — satu-satunya pemanggil
   * lintas modul yang sah fase ini) saat baris `project_tools` pending
   * tercipta. Satu baris notifikasi per user AKTIF dengan role tsb.
   * `Notification` TAK diaudit (`src/audit/audit.extension.ts` — di luar
   * `AUDITED_MODELS`), jadi `createMany` aman tanpa jebakan
   * `$transaction([array])`.
   */
  async notifyRole(role: AppRole, payload: NotifyRolePayload): Promise<void> {
    const recipients = await this.prisma.user.findMany({
      where: { role, isActive: true },
      select: { id: true },
    });
    if (recipients.length === 0) return;

    await this.prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
      })),
    });
  }
}
