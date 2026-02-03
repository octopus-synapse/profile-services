import {
  Controller,
  Get,
  Param,
  Headers,
  ForbiddenException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ResumeShareService } from '../services/resume-share.service';
import { ShareAnalyticsService } from '@/bounded-contexts/analytics/share-analytics/services/share-analytics.service';
import { Public } from '@/bounded-contexts/identity/auth/decorators/public.decorator';
import type { Request } from 'express';

@Controller('v1/public/resumes')
@Public() // Public endpoint - no auth required
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
        throw new ForbiddenException('Password required');
      }

      const isValid = await this.shareService.verifyPassword(
        password,
        share.password,
      );

      if (!isValid) {
        throw new ForbiddenException('Invalid password');
      }
    }

    // Track view event
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) ??
      req.socket.remoteAddress ??
      'unknown';

    await this.analyticsService.trackEvent({
      shareId: share.id,
      event: 'VIEW',
      ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
    });

    const resume = await this.shareService.getResumeWithCache(share.resumeId);

    return {
      resume,
      share: {
        slug: share.slug,
        expiresAt: share.expiresAt,
      },
    };
  }

  @Get(':slug/download')
  async downloadPublicResume(
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
        throw new ForbiddenException('Password required');
      }

      const isValid = await this.shareService.verifyPassword(
        password,
        share.password,
      );

      if (!isValid) {
        throw new ForbiddenException('Invalid password');
      }
    }

    // Track download event
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) ??
      req.socket.remoteAddress ??
      'unknown';

    void this.analyticsService.trackEvent({
      shareId: share.id,
      event: 'DOWNLOAD',
      ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
    });

    const resume = await this.shareService.getResumeWithCache(share.resumeId);

    return {
      resume,
      share: {
        slug: share.slug,
        expiresAt: share.expiresAt,
      },
    };
  }
}
