// acme-backend/src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/guards/jwt-auth.guard';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
} from './dto/notification-response.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * `notifications` — WP-19 (fase-2 §4). `@Roles` di sini murni gerbang
 * (master §4.8 "notifications — miliknya": pimpinan/admin/staff_gudang
 * semua lolos). Scoping "miliknya" ADA DI SERVICE, bukan di controller ini
 * — lihat notifications.service.ts.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles('pimpinan', 'admin', 'staff_gudang')
  @ApiOkResponse({ type: NotificationListResponseDto })
  @Get()
  findAll(@Query() query: QueryNotificationsDto, @Req() req: RequestWithUser) {
    const userId = (req.user as AuthenticatedUser).id;
    return this.notificationsService.findAllForUser(userId, query);
  }

  @Roles('pimpinan', 'admin', 'staff_gudang')
  @ApiOkResponse({ type: NotificationResponseDto })
  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = (req.user as AuthenticatedUser).id;
    return this.notificationsService.markRead(id, userId);
  }
}
