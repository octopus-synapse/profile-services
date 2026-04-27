/**
 * Export PDF Controller
 * Handles PDF resume export. Lifecycle (Requested/Completed/Failed events
 * + 500 translation) is in `ExportPipelineService`; cache lookup wraps the
 * use-case call inside the pipeline task so cache hits still emit events.
 */

import { Controller, Get, Header, Param, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiStreamResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { FeatureFlag } from '@/bounded-contexts/platform/feature-flags/infrastructure/guards/feature-flag.guard';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ExportUseCases } from '../../application/ports/export.port';
import { ExportPipelineService } from '../../application/services/export-pipeline.service';
import { sanitizeQueryParam } from '../helpers';
import { presentPdfAsBase64 } from '../presenters/pdf-base64.presenter';
import { PdfCacheService } from '../services/pdf-cache.service';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportPdfController {
  constructor(
    private readonly useCases: ExportUseCases,
    private readonly pipeline: ExportPipelineService,
    private readonly pdfCache: PdfCacheService,
  ) {}

  @RequirePermission(Permission.RESUME_EXPORT)
  @FeatureFlag('resumes.export.pdf')
  @Get('resume/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="resume.pdf"')
  @ApiOperation({ summary: 'Export resume as PDF document' })
  @ApiProduces('application/pdf')
  @ApiQuery({ name: 'palette', required: false, description: 'Color palette name for styling' })
  @ApiQuery({ name: 'lang', required: false, description: 'Language code (e.g., en, pt)' })
  @ApiQuery({ name: 'bannerColor', required: false, description: 'Custom banner color (hex)' })
  @ApiQuery({
    name: 'template',
    required: false,
    description: 'Template variant: "default" or "ats" (ATS-optimized for perfect score)',
    enum: ['default', 'ats'],
  })
  @ApiStreamResponse({ mimeType: 'application/pdf', description: 'PDF document file' })
  async exportResumePDF(
    @CurrentUser() user: UserPayload,
    @Query('palette') palette?: string,
    @Query('lang') lang?: string,
    @Query('bannerColor') bannerColor?: string,
    @Query('template') template?: 'default' | 'ats',
  ): Promise<StreamableFile> {
    // Sanitize query parameters to prevent path traversal and injection attacks
    const safePalette = sanitizeQueryParam(palette);
    const safeLang = sanitizeQueryParam(lang);
    const safeBannerColor = sanitizeQueryParam(bannerColor);
    const safeTemplate = template === 'ats' ? ('ats' as const) : ('default' as const);

    const buffer = await this.pipeline.run('pdf', user.userId, () =>
      this.pdfCache.serve(
        {
          userId: user.userId,
          renderArgs: {
            palette: safePalette,
            lang: safeLang,
            bannerColor: safeBannerColor,
            template: safeTemplate,
          },
        },
        () =>
          this.useCases.exportPdfUseCase.execute({
            palette: safePalette,
            lang: safeLang,
            bannerColor: safeBannerColor,
            userId: user.userId,
            template: safeTemplate,
          }),
      ),
    );
    return new StreamableFile(buffer);
  }

  @Get('user/:userId/resume/pdf')
  @ApiOperation({ summary: "Generate another user's resume as PDF (base64)" })
  @ApiDataResponse(Object, { description: 'PDF as base64 string' })
  async downloadUserResumePDF(
    @CurrentUser() _user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<DataResponse<{ pdf: string; filename: string }>> {
    const buffer = await this.pipeline.run('pdf', targetUserId, () =>
      this.pdfCache.serve({ userId: targetUserId, renderArgs: {} }, () =>
        this.useCases.exportPdfUseCase.execute({ userId: targetUserId }),
      ),
    );
    return { success: true, data: presentPdfAsBase64(buffer) };
  }
}
