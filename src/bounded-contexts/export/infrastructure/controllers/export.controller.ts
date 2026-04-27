/**
 * Export Controller
 *
 * Aggregated export endpoints (banner / pdf / docx / bundle). Each handler
 * is a wire: it sanitizes inputs, hands the task to `ExportPipelineService`
 * (which owns the Requested/Completed/Failed event lifecycle and the
 * 500 translation), and returns the resulting buffer.
 */

import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiStreamResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ExportUseCases } from '../../application/ports/export.port';
import { ExportPipelineService } from '../../application/services/export-pipeline.service';
import { parseBundleFormats } from '../../application/utils/parse-bundle-formats';
import { BannerCaptureService } from '../adapters/external-services/banner-capture.service';

/**
 * Sanitizes query parameters to prevent path traversal attacks.
 * Only allows alphanumeric characters, hyphens, underscores, and spaces.
 * Returns undefined if input contains dangerous characters.
 */
function sanitizeQueryParam(input: string | undefined): string | undefined {
  if (!input) return undefined;

  // Detect path traversal attempts
  if (input.includes('..') || input.includes('/') || input.includes('\\')) {
    return undefined;
  }

  // Detect shell injection attempts
  if (/[;|`$(){ {2}}]/.test(input)) {
    return undefined;
  }

  // Only allow safe characters: alphanumeric, hyphens, underscores, spaces
  const sanitized = input.replace(/[^a-zA-Z0-9\-_ ]/g, '');

  // If sanitization changed the input significantly, reject it
  if (sanitized.length < input.length * 0.8) {
    return undefined;
  }

  return sanitized || undefined;
}

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportController {
  constructor(
    private readonly bannerCaptureService: BannerCaptureService,
    private readonly useCases: ExportUseCases,
    private readonly pipeline: ExportPipelineService,
  ) {}

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('banner')
  @ApiOperation({ summary: 'Export LinkedIn banner image' })
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'attachment; filename="linkedin-banner.png"')
  @ApiStreamResponse({ mimeType: 'image/png', description: 'PNG image file' })
  @ApiProduces('image/png')
  @ApiQuery({ name: 'palette', required: false, description: 'Color palette name' })
  @ApiQuery({ name: 'logo', required: false, description: 'Logo URL to include in banner' })
  async exportBanner(
    @Query('palette') palette?: string,
    @Query('logo') logoUrl?: string,
  ): Promise<StreamableFile> {
    const safePalette = sanitizeQueryParam(palette);
    // logoUrl is more permissive but still needs basic sanitization
    const safeLogoUrl = logoUrl && !logoUrl.includes('..') ? logoUrl : undefined;
    const buffer = await this.pipeline.runBanner(() =>
      this.bannerCaptureService.capture(safePalette, safeLogoUrl),
    );
    return new StreamableFile(buffer);
  }

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('resume/pdf')
  @ApiOperation({ summary: 'Export resume as PDF' })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="resume.pdf"')
  @ApiStreamResponse({ mimeType: 'application/pdf', description: 'PDF document file' })
  @ApiProduces('application/pdf')
  @ApiQuery({ name: 'palette', required: false, description: 'Color palette name for styling' })
  @ApiQuery({ name: 'lang', required: false, description: 'Language code (e.g., en, pt)' })
  @ApiQuery({ name: 'bannerColor', required: false, description: 'Custom banner color (hex)' })
  async exportResumePDF(
    @CurrentUser() user: UserPayload,
    @Query('palette') palette?: string,
    @Query('lang') lang?: string,
    @Query('bannerColor') bannerColor?: string,
  ): Promise<StreamableFile> {
    const safePalette = sanitizeQueryParam(palette);
    const safeLang = sanitizeQueryParam(lang);
    const safeBannerColor = sanitizeQueryParam(bannerColor);
    const buffer = await this.pipeline.run('pdf', user.userId, () =>
      this.useCases.exportPdfUseCase.execute({
        palette: safePalette,
        lang: safeLang,
        bannerColor: safeBannerColor,
        userId: user.userId,
      }),
    );
    return new StreamableFile(buffer);
  }

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('resume/docx')
  @ApiOperation({ summary: 'Export resume as DOCX' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  @Header('Content-Disposition', 'attachment; filename="resume.docx"')
  @ApiStreamResponse({
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'DOCX document file',
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  async exportResumeDOCX(@CurrentUser() user: UserPayload): Promise<StreamableFile> {
    const buffer = await this.pipeline.run('docx', user.userId, () =>
      this.useCases.exportDocxUseCase.execute({ userId: user.userId }),
    );
    return new StreamableFile(buffer);
  }

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('resume/bundle')
  @ApiOperation({
    summary: 'Download resume as a single zip containing PDF, DOCX and JSON formats',
  })
  @Header('Content-Type', 'application/zip')
  @Header('Content-Disposition', 'attachment; filename="resume-bundle.zip"')
  @ApiStreamResponse({ mimeType: 'application/zip', description: 'Zip file with all formats' })
  @ApiProduces('application/zip')
  @ApiQuery({
    name: 'formats',
    required: false,
    description: 'Comma-separated subset of pdf, docx, json (default: all)',
  })
  async exportResumeBundle(
    @CurrentUser() user: UserPayload,
    @Query('formats') formats?: string,
  ): Promise<StreamableFile> {
    const parsed = parseBundleFormats(formats);
    const buffer = await this.pipeline.run('bundle', user.userId, () =>
      this.useCases.exportBundleUseCase.execute({
        userId: user.userId,
        resumeId: user.userId,
        formats: parsed,
      }),
    );
    return new StreamableFile(buffer);
  }
}
