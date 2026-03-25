import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ShareAnalyticsEventsDataDto,
  ShareAnalyticsSummaryDataDto,
} from '../dto/controller-response.dto';
import { ShareAnalyticsService } from '../services/share-analytics.service';

export interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@ApiTags('share-analytics')
@Controller('v1')
export class ShareAnalyticsController {
  constructor(private readonly analyticsService: ShareAnalyticsService) {}

  // Original nested endpoint
  @Get('resumes/:resumeId/shares/:shareId/analytics')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiOperation({ summary: 'Get analytics for a shared resume (nested route)' })
  @ApiDataResponse(ShareAnalyticsSummaryDataDto, {
    description: 'Share analytics returned',
  })
  async getAnalyticsNested(
    @Param('resumeId') _resumeId: string,
    @Param('shareId') shareId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ShareAnalyticsSummaryDataDto>> {
    const analytics = await this.analyticsService.getAnalytics(shareId, req.user.userId);

    return {
      success: true,
      data: {
        analytics,
      },
    };
  }

  // Flat endpoints for easier testing
  @Get('analytics/:shareId')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiOperation({ summary: 'Get analytics for a share id' })
  @ApiDataResponse(ShareAnalyticsSummaryDataDto, {
    description: 'Share analytics returned',
  })
  async getAnalytics(
    @Param('shareId') shareId: string,
    @Req() req: RequestWithUser,
  ): Promise<DataResponse<ShareAnalyticsSummaryDataDto>> {
    const analytics = await this.analyticsService.getAnalytics(shareId, req.user.userId);

    return {
      success: true,
      data: {
        analytics,
      },
    };
  }

  @Get('analytics/:shareId/events')
  @RequirePermission(Permission.ANALYTICS_READ_OWN)
  @ApiOperation({ summary: 'Get analytics events for a share id' })
  @ApiDataResponse(ShareAnalyticsEventsDataDto, {
    description: 'Share analytics events returned',
  })
  async getAnalyticsEvents(
    @Param('shareId') shareId: string,
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eventType') eventType?: 'VIEW' | 'DOWNLOAD',
  ): Promise<DataResponse<ShareAnalyticsEventsDataDto>> {
    const events = await this.analyticsService.getEvents(shareId, req.user.userId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventType,
    });

    return {
      success: true,
      data: {
        events,
      },
    };
  }
}
