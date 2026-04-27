import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ShareNotFoundException } from '../../domain/exceptions/presentation.exceptions';
import { OgImageService } from '../services/og-image.service';
import { ResumeShareService } from '../services/resume-share.service';

/**
 * Legacy controller for the OpenGraph PNG endpoint. Kept as a Nest
 * `@Controller` because the synthesizer does not yet model
 * `StreamableFile` responses or the `@Header()` decorators required to
 * set `Content-Type` / `Cache-Control` for binary assets.
 */
@ApiTags('public-resumes')
@Controller('v1/public/resumes')
@Public() // Public endpoint - no auth required
export class PublicResumeController {
  constructor(
    private readonly shareService: ResumeShareService,
    private readonly ogImageService: OgImageService,
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
}
