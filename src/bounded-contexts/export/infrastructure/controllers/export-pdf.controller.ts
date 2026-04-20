/**
 * Export PDF Controller
 * Handles PDF resume export
 */

import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  Header,
  Inject,
  InternalServerErrorException,
  Param,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiStreamResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { EXPORT_USE_CASES, type ExportUseCases } from '../../application/ports/export.port';
import { ExportCompletedEvent, ExportFailedEvent, ExportRequestedEvent } from '../../domain/events';
import { sanitizeQueryParam } from '../helpers';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportPdfController {
  constructor(
    @Inject(EXPORT_USE_CASES)
    private readonly useCases: ExportUseCases,
    private readonly logger: AppLoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(ExportPdfController.name);
  }

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('resume/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="resume.pdf"')
  @ApiOperation({ summary: 'Export resume as PDF document' })
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
  @ApiQuery({
    name: 'template',
    required: false,
    description: 'Template variant: "default" or "ats" (ATS-optimized for perfect score)',
    enum: ['default', 'ats'],
  })
  @ApiStreamResponse({
    mimeType: 'application/pdf',
    description: 'PDF document file',
  })
  async exportResumePDF(
    @CurrentUser() user: UserPayload,
    @Query('palette') palette?: string,
    @Query('lang') lang?: string,
    @Query('bannerColor') bannerColor?: string,
    @Query('template') template?: 'default' | 'ats',
  ): Promise<StreamableFile> {
    const exportId = randomUUID();

    // Sanitize query parameters to prevent path traversal and injection attacks
    const safePalette = sanitizeQueryParam(palette);
    const safeLang = sanitizeQueryParam(lang);
    const safeBannerColor = sanitizeQueryParam(bannerColor);
    const safeTemplate = template === 'ats' ? ('ats' as const) : ('default' as const);

    // Emit export requested event before processing
    this.eventEmitter.emit(
      ExportRequestedEvent.TYPE,
      new ExportRequestedEvent(exportId, {
        resumeId: user.userId, // Using userId as resumeId (1:1 relationship)
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
        template: safeTemplate,
      });

      // Emit export completed event
      this.eventEmitter.emit(
        ExportCompletedEvent.TYPE,
        new ExportCompletedEvent(exportId, {
          resumeId: user.userId,
          fileUrl: '', // No URL - direct download
        }),
      );

      return new StreamableFile(buffer);
    } catch (error) {
      // Emit export failed event
      this.eventEmitter.emit(
        ExportFailedEvent.TYPE,
        new ExportFailedEvent(exportId, {
          resumeId: user.userId,
          reason: error instanceof Error ? error.message : String(error),
        }),
      );

      this.logger.errorWithMeta('Failed to generate PDF', {
        userId: user.userId,
        palette: safePalette,
        lang: safeLang,
        bannerColor: safeBannerColor,
        template: safeTemplate,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException('Failed to generate PDF. Please try again later.');
    }
  }

  @Get('user/:userId/resume/pdf')
  @ApiOperation({ summary: "Generate another user's resume as PDF (base64)" })
  @ApiDataResponse(Object, { description: 'PDF as base64 string' })
  async downloadUserResumePDF(
    @CurrentUser() _user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<DataResponse<{ pdf: string; filename: string }>> {
    try {
      const buffer = await this.useCases.exportPdfUseCase.execute({
        userId: targetUserId,
      });
      return {
        success: true,
        data: {
          pdf: buffer.toString('base64'),
          filename: 'resume.pdf',
        },
      };
    } catch (error) {
      this.logger.errorWithMeta('Failed to generate PDF for user', {
        targetUserId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new InternalServerErrorException('Failed to generate PDF. Please try again later.');
    }
  }
}
