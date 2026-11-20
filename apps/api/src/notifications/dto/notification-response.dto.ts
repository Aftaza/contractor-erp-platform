// acme-backend/src/notifications/dto/notification-response.dto.ts
//
// KONTRAK RESPONSE — aturan worker §6 #7. Kelas, bukan interface/type alias.
// Tak ada kolom bigint/Decimal di `notifications` — bentuk wire sama persis
// bentuk Prisma `Notification`.
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationResponseDto {
  id: string;
  userId: string;

  @ApiProperty({ enum: NotificationType, enumName: 'NotificationType' })
  type: NotificationType;

  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
}

/** Master §3.2 — bentuk `meta` seragam. */
export class NotificationPaginationMetaDto {
  page: number;
  perPage: number;
  total: number;
}

/** Master §3.2 — `GET /notifications`. */
export class NotificationListResponseDto {
  data: NotificationResponseDto[];
  meta: NotificationPaginationMetaDto;
}
