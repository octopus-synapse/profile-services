import { Controller, Get, Header, Headers, Param, Req, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ShareNotFoundException } from '../../domain/exceptions/presentation.exceptions';
import {
  type AccessMode,
  AccessPublicResumeUseCase,
} from '../application/use-cases/access-public-resume.use-case';
import { PublicResumeDataDto } from '../dto/public-resume-response.dto';
import { OgImageService } from '../services/og-image.service';
import { ResumeShareService } from '../services/resume-share.service';

@SdkExport({ tag: 'resumes', description: 'Public Resume API', requiresAuth: false })
@ApiTags('public-resumes')
@Controller('v1/public/resumes')
@Public() // Public endpoint - no auth required
export class PublicResumeController {
  constructor(
    private readonly shareService: ResumeShareService,
    private readonly ogImageService: OgImageService,
    private readonly accessResume: AccessPublicResumeUseCase,
  ) {}

  @Get(':slug/og.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: 'OpenGraph preview image for a public share slug' })
  @ApiProduces('image/png')
  async getOgImage(@Param('slug') slug: string): Promise<StreamableFile> {
    const context = await this.shareService.getShareOgContext(slug);
    if (!context) throw new ShareNotFoundException();
    const buffer = await this.ogImageService.generatePng(context);
    return new StreamableFile(buffer);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get public resume by share slug' })
  @ApiDataResponse(PublicResumeDataDto, { description: 'Public resume returned' })
  async getPublicResume(
    @Param('slug') slug: string,
    @Headers('x-share-password') password: string | undefined,
    @Req() req: Request,
  ): Promise<DataResponse<PublicResumeDataDto>> {
    return this.runAccess(slug, password, req, 'view');
  }

  @Get(':slug/download')
  @ApiOperation({ summary: 'Download public resume by share slug' })
  @ApiDataResponse(PublicResumeDataDto, { description: 'Public resume download payload returned' })
  async downloadPublicResume(
    @Param('slug') slug: string,
    @Headers('x-share-password') password: string | undefined,
    @Req() req: Request,
  ): Promise<DataResponse<PublicResumeDataDto>> {
    return this.runAccess(slug, password, req, 'download');
  }

  private async runAccess(
    slug: string,
    password: string | undefined,
    req: Request,
    mode: AccessMode,
  ): Promise<DataResponse<PublicResumeDataDto>> {
    const { resume, share } = await this.accessResume.execute({
      slug,
      password,
      mode,
      ip: pickIp(req),
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
    });
    return {
      success: true,
      data: { resume, share },
      resume,
      share,
    } as DataResponse<PublicResumeDataDto> & {
      resume: unknown;
      share: { slug: string; expiresAt: Date | null };
    };
  }
}

function pickIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  return (
    (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) ??
    req.socket.remoteAddress ??
    'unknown'
  );
}
