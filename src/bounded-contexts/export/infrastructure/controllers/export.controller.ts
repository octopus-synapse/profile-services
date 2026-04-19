import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  Header,
  Inject,
  InternalServerErrorException,
  Query,
  StreamableFile,
} from '@nestjs/common';

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
  if (/[;|`$(){}]/.test(input)) {
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

import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiStreamResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { EventPublisher } from '@/shared-kernel';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { EXPORT_USE_CASES, type ExportUseCases } from '../../application/ports/export.port';
import { parseBundleFormats } from '../../application/utils/parse-bundle-formats';
import { ExportCompletedEvent, ExportFailedEvent, ExportRequestedEvent } from '../../domain/events';
import { BannerCaptureService } from '../adapters/external-services/banner-capture.service';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportController {
  constructor(
    private readonly bannerCaptureService: BannerCaptureService,
    @Inject(EXPORT_USE_CASES)
    private readonly useCases: ExportUseCases,
    private readonly logger: AppLoggerService,
    private readonly eventPublisher: EventPublisher,
  ) {
    this.logger.setContext(ExportController.name);
  }

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('banner')
  @ApiOperation({ summary: 'Export LinkedIn banner image' })
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'attachment; filename="linkedin-banner.png"')
  @ApiStreamResponse({ mimeType: 'image/png', description: 'PNG image file' })
  @ApiProduces('image/png')
  @ApiQuery({
    name: 'palette',
    required: false,
    description: 'Color palette name',
  })
  @ApiQuery({
    name: 'logo',
    required: false,
    description: 'Logo URL to include in banner',
  })
  async exportBanner(
    @Query('palette') palette?: string,
    @Query('logo') logoUrl?: string,
  ): Promise<StreamableFile> {
    // Sanitize query parameters to prevent path traversal and injection attacks
    const safePalette = sanitizeQueryParam(palette);
    // logoUrl is more permissive but still needs basic sanitization
    const safeLogoUrl = logoUrl && !logoUrl.includes('..') ? logoUrl : undefined;

    try {
      const buffer = await this.bannerCaptureService.capture(safePalette, safeLogoUrl);
      return new StreamableFile(buffer);
    } catch (error) {
      this.logger.errorWithMeta('Failed to generate banner', {
        palette: safePalette,
        logoUrl: safeLogoUrl,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException('Failed to generate banner. Please try again later.');
    }
  }

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('resume/pdf')
  @ApiOperation({ summary: 'Export resume as PDF' })
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="resume.pdf"')
  @ApiStreamResponse({
    mimeType: 'application/pdf',
    description: 'PDF document file',
  })
  @ApiProduces('application/pdf')
  @ApiQuery({
    name: 'palette',
    required: false,
    description: 'Color palette name for styling',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code (e.g., en, pt)',
  })
  @ApiQuery({
    name: 'bannerColor',
    required: false,
    description: 'Custom banner color (hex)',
  })
  async exportResumePDF(
    @CurrentUser() user: UserPayload,
    @Query('palette') palette?: string,
    @Query('lang') lang?: string,
    @Query('bannerColor') bannerColor?: string,
  ): Promise<StreamableFile> {
    const exportId = randomUUID();

    // Sanitize query parameters to prevent path traversal and injection attacks
    const safePalette = sanitizeQueryParam(palette);
    const safeLang = sanitizeQueryParam(lang);
    const safeBannerColor = sanitizeQueryParam(bannerColor);

    this.eventPublisher.publish(
      new ExportRequestedEvent(exportId, {
        resumeId: 'user-default',
        userId: user.userId,
        format: 'pdf',
      }),
    );

    try {
      const buffer = await this.useCases.exportPdfUseCase.execute({
        palette: safePalette,
        lang: safeLang,
        bannerColor: safeBannerColor,
        userId: user.userId,
      });

      this.eventPublisher.publish(
        new ExportCompletedEvent(exportId, {
          resumeId: 'user-default',
          fileUrl: 'inline',
        }),
      );

      return new StreamableFile(buffer);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      this.eventPublisher.publish(
        new ExportFailedEvent(exportId, {
          resumeId: 'user-default',
          reason,
        }),
      );

      this.logger.errorWithMeta('Failed to generate PDF', {
        userId: user.userId,
        palette: safePalette,
        lang: safeLang,
        bannerColor: safeBannerColor,
        error: reason,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException('Failed to generate PDF. Please try again later.');
    }
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
    const exportId = randomUUID();

    this.eventPublisher.publish(
      new ExportRequestedEvent(exportId, {
        resumeId: 'user-default',
        userId: user.userId,
        format: 'docx',
      }),
    );

    try {
      const buffer = await this.useCases.exportDocxUseCase.execute({ userId: user.userId });

      this.eventPublisher.publish(
        new ExportCompletedEvent(exportId, {
          resumeId: 'user-default',
          fileUrl: 'inline',
        }),
      );

      return new StreamableFile(buffer);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      this.eventPublisher.publish(
        new ExportFailedEvent(exportId, {
          resumeId: 'user-default',
          reason,
        }),
      );

      this.logger.errorWithMeta('Failed to generate DOCX', {
        userId: user.userId,
        error: reason,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException('Failed to generate DOCX. Please try again later.');
    }
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
    description: 'Comma-separated subset of pdf,docx,json (default: all)',
  })
  async exportResumeBundle(
    @CurrentUser() user: UserPayload,
    @Query('formats') formats?: string,
  ): Promise<StreamableFile> {
    const exportId = randomUUID();
    const parsed = parseBundleFormats(formats);

    this.eventPublisher.publish(
      new ExportRequestedEvent(exportId, {
        resumeId: 'user-default',
        userId: user.userId,
        format: 'bundle',
      }),
    );

    try {
      const buffer = await this.useCases.exportBundleUseCase.execute({
        userId: user.userId,
        resumeId: user.userId,
        formats: parsed,
      });

      this.eventPublisher.publish(
        new ExportCompletedEvent(exportId, {
          resumeId: 'user-default',
          fileUrl: 'inline',
        }),
      );

      return new StreamableFile(buffer);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.eventPublisher.publish(
        new ExportFailedEvent(exportId, { resumeId: 'user-default', reason }),
      );
      this.logger.errorWithMeta('Failed to generate export bundle', {
        userId: user.userId,
        error: reason,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException(
        'Failed to generate export bundle. Please try again later.',
      );
    }
  }
}
