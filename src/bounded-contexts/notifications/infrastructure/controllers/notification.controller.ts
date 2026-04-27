import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { NotificationType } from '@prisma/client';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { GetPreferencesUseCase } from '../../application/use-cases/get-preferences/get-preferences.use-case';
import { GetUnreadCountUseCase } from '../../application/use-cases/get-unread-count/get-unread-count.use-case';
import { ListNotificationsUseCase } from '../../application/use-cases/list-notifications/list-notifications.use-case';
import { MarkNotificationsReadUseCase } from '../../application/use-cases/mark-notifications-read/mark-notifications-read.use-case';
import { SetPreferenceUseCase } from '../../application/use-cases/set-preference/set-preference.use-case';
import {
  MarkReadDataDto,
  NotificationsListDataDto,
  UnreadCountDataDto,
} from '../../dto/notification-response.dto';

@SdkExport({ tag: 'notifications', description: 'Notifications API' })
@ApiTags('notifications')
@ApiBearerAuth()
@RequirePermission(Permission.NOTIFICATION_READ)
@Controller('v1/notifications')
export class NotificationController {
  constructor(
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly getUnreadCount: GetUnreadCountUseCase,
    private readonly markRead: MarkNotificationsReadUseCase,
    private readonly getPreferences: GetPreferencesUseCase,
    private readonly setPreference: SetPreferenceUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(NotificationsListDataDto, { description: 'List of notifications' })
  async getByUser(
    @Req() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.listNotifications.execute(
      req.user.userId,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiDataResponse(UnreadCountDataDto, { description: 'Unread notification count' })
  async getUnreadCountEndpoint(@Req() req: { user: { userId: string } }) {
    const count = await this.getUnreadCount.execute(req.user.userId);
    return { count };
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiDataResponse(MarkReadDataDto, { description: 'Notifications marked as read' })
  async markReadEndpoint(
    @Req() req: { user: { userId: string } },
    @Body() body: { notificationId?: string },
  ) {
    return this.markRead.execute(req.user.userId, body.notificationId);
  }

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  async getPreferencesEndpoint(@Req() req: { user: { userId: string } }) {
    const preferences = await this.getPreferences.execute(req.user.userId);
    return { preferences };
  }

  @Put('preferences/:type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Update a notification type preference (in-app enable + email channel + delivery mode).',
  })
  @ApiParam({ name: 'type', type: 'string' })
  async setPreferenceEndpoint(
    @Req() req: { user: { userId: string } },
    @Param('type') type: NotificationType,
    @Body()
    body: {
      enabled?: boolean;
      emailEnabled?: boolean;
      emailDelivery?: 'INSTANT' | 'DAILY' | 'WEEKLY' | 'OFF';
    },
  ) {
    return this.setPreference.execute(req.user.userId, type, body);
  }
}
