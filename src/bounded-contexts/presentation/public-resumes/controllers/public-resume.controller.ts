import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  NotFoundException,
  Param,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { EventPublisher } from '@/shared-kernel';
import { ShareDownloadedEvent, ShareViewedEvent } from '../../shared-kernel/domain/events';
import { PublicResumeDataDto } from '../dto/public-resume-response.dto';
import { OgImageService } from '../services/og-image.service';
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
    private readonly eventPublisher: EventPublisher,
    private readonly ogImageService: OgImageService,
  ) {}

  @Get(':slug/og.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: 'OpenGraph preview image for a public share slug' })
  @ApiProduces('image/png')
  async getOgImage(@Param('slug') slug: string): Promise<StreamableFile> {
    const context = await this.shareService.getShareOgContext(slug);
    if (!context) {
      throw new NotFoundException('Resume not found');
    }

    const buffer = await this.ogImageService.generatePng(context);
    return new StreamableFile(buffer);
  }

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

    await this.eventPublisher.publishAsync(
      new ShareViewedEvent(share.id, {
        shareId: share.id,
        ip,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
      }),
    );

    const resume = await this.shareService.getResumeWithCache(share.resumeId);
    const shareInfo = {
      slug: share.slug,
      expiresAt: share.expiresAt,
    };

    return {
      success: true,
      data: {
        resume,
        share: shareInfo,
      },
      resume,
      share: shareInfo,
    } as DataResponse<PublicResumeDataDto> & {
      resume: unknown;
      share: { slug: string; expiresAt: Date | null };
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

    this.eventPublisher.publish(
      new ShareDownloadedEvent(share.id, {
        shareId: share.id,
        ip,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
      }),
    );

    const resume = await this.shareService.getResumeWithCache(share.resumeId);
    const shareInfo = {
      slug: share.slug,
      expiresAt: share.expiresAt,
    };

    return {
      success: true,
      data: {
        resume,
        share: shareInfo,
      },
      resume,
      share: shareInfo,
    } as DataResponse<PublicResumeDataDto> & {
      resume: unknown;
      share: { slug: string; expiresAt: Date | null };
    };
  }
}
