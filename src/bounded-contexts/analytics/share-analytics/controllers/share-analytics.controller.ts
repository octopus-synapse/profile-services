import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { ShareAnalyticsService } from '../services/share-analytics.service';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@Controller('v1')
@UseGuards(JwtAuthGuard)
export class ShareAnalyticsController {
  constructor(private readonly analyticsService: ShareAnalyticsService) {}

  // Original nested endpoint
  @Get('resumes/:resumeId/shares/:shareId/analytics')
  async getAnalyticsNested(
    @Param('resumeId') _resumeId: string,
    @Param('shareId') shareId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.analyticsService.getAnalytics(shareId, req.user.userId);
  }

  // Flat endpoints for easier testing
  @Get('analytics/:shareId')
  async getAnalytics(@Param('shareId') shareId: string, @Req() req: RequestWithUser) {
    return this.analyticsService.getAnalytics(shareId, req.user.userId);
  }

  @Get('analytics/:shareId/events')
  async getAnalyticsEvents(
    @Param('shareId') shareId: string,
    @Req() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eventType') eventType?: 'VIEW' | 'DOWNLOAD',
  ) {
    return this.analyticsService.getEvents(shareId, req.user.userId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventType,
    });
  }
}
