import {
  Controller,
  Get,
  Param,
  Headers,
  UnauthorizedException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ResumeShareService } from '../services/resume-share.service';
import { ShareAnalyticsService } from '../../share-analytics/services/share-analytics.service';
import type { Request } from 'express';

@Controller('api/v1/public/resumes')
export class PublicResumeController {
  constructor(
    private readonly shareService: ResumeShareService,
    private readonly analyticsService: ShareAnalyticsService,
  ) {}

  @Get(':slug')
  async getPublicResume(
    @Param('slug') slug: string,
    @Headers('x-share-password') password: string | undefined,
    @Req() req: Request,
  ) {
    const share = await this.shareService.getBySlug(slug);

    if (!share) {
      throw new NotFoundException('Resume not found');
    }

    // Check expiration
    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new NotFoundException('Share link expired');
    }

    // Check password
    if (share.password) {
      if (!password) {
        throw new UnauthorizedException('Password required');
      }

      const isValid = await this.shareService.verifyPassword(
        password,
        share.password,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    // Track view event
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) ??
      req.socket.remoteAddress ??
      'unknown';

    void this.analyticsService.trackEvent({
      shareId: share.id,
      event: 'VIEW',
      ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
    });

    return this.shareService.getResumeWithCache(share.resumeId);
  }
}
