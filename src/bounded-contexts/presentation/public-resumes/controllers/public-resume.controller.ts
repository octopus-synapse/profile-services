import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ShareAnalyticsService } from '@/bounded-contexts/analytics/share-analytics/services/share-analytics.service';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { PublicResumeDataDto } from '../dto/public-resume-response.dto';
import { ResumeShareService } from '../services/resume-share.service';

@SdkExport({
  tag: 'resumes',
  description: 'Public Resume API',
  requiresAuth: false,
})
@ApiTags('public-resumes')
@Controller('v1/public/resumes')
@Public() // Public endpoint - no auth required
export class PublicResumeController {
  constructor(
    private readonly shareService: ResumeShareService,
    private readonly analyticsService: ShareAnalyticsService,
  ) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public resume by share slug' })
  @ApiDataResponse(PublicResumeDataDto, {
    description: 'Public resume returned',
  })
  async getPublicResume(
    @Param('slug') slug: string,
    @Headers('x-share-password') password: string | undefined,
    @Req() req: Request,
  ): Promise<DataResponse<PublicResumeDataDto>> {
    const share = await this.shareService.getBySlug(slug);

    if (!share) {
      throw new NotFoundException('Resume not found');
    }

    if (!share.isActive) {
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

      const isValid = await this.shareService.verifyPassword(password, share.password);

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
      success: true,
      data: {
        resume,
        share: {
          slug: share.slug,
          expiresAt: share.expiresAt,
        },
      },
    };
  }

  @Get(':slug/download')
  @ApiOperation({ summary: 'Download public resume by share slug' })
  @ApiDataResponse(PublicResumeDataDto, {
    description: 'Public resume download payload returned',
  })
  async downloadPublicResume(
    @Param('slug') slug: string,
    @Headers('x-share-password') password: string | undefined,
    @Req() req: Request,
  ): Promise<DataResponse<PublicResumeDataDto>> {
    const share = await this.shareService.getBySlug(slug);

    if (!share) {
      throw new NotFoundException('Resume not found');
    }

    if (!share.isActive) {
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

      const isValid = await this.shareService.verifyPassword(password, share.password);

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
      success: true,
      data: {
        resume,
        share: {
          slug: share.slug,
          expiresAt: share.expiresAt,
        },
      },
    };
  }
}
