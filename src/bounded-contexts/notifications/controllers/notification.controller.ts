import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  MarkReadDataDto,
  NotificationsListDataDto,
  UnreadCountDataDto,
} from '../dto/notification-response.dto';
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
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(NotificationsListDataDto, {
    description: 'List of notifications',
  })
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
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiDataResponse(UnreadCountDataDto, {
    description: 'Unread notification count',
  })
  async getUnreadCount(@Req() req: { user: { userId: string } }) {
    const count = await this.notificationService.getUnreadCount(req.user.userId);
    return { count };
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiDataResponse(MarkReadDataDto, {
    description: 'Notifications marked as read',
  })
  async markRead(
    @Req() req: { user: { userId: string } },
    @Body() body: { notificationId?: string },
  ) {
    return this.notificationService.markRead(req.user.userId, body.notificationId);
  }
}
