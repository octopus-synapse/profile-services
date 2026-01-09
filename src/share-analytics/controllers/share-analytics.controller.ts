import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShareAnalyticsService } from '../services/share-analytics.service';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@Controller('api/v1/resumes/:resumeId/shares/:shareId/analytics')
@UseGuards(JwtAuthGuard)
export class ShareAnalyticsController {
  constructor(private readonly analyticsService: ShareAnalyticsService) {}

  @Get()
  async getAnalytics(
    @Param('resumeId') resumeId: string,
    @Param('shareId') shareId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.analyticsService.getAnalytics(shareId, req.user.id);
  }
}
