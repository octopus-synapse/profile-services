import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { NotificationService } from '../services/notification.service';

@SdkExport({ tag: 'notifications', description: 'Notifications API' })
@ApiTags('notifications')
@ApiBearerAuth()
@RequirePermission(Permission.NOTIFICATION_READ)
@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getByUser(
    @Req() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getByUser(
      req.user.userId,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@Req() req: { user: { userId: string } }) {
    const count = await this.notificationService.getUnreadCount(req.user.userId);
    return { count };
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @Req() req: { user: { userId: string } },
    @Body() body: { notificationId?: string },
  ) {
    return this.notificationService.markRead(req.user.userId, body.notificationId);
  }
}
