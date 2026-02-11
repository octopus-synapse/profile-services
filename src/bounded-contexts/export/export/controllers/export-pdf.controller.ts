/**
 * Export PDF Controller
 * Handles PDF resume export
 */

import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  Header,
  InternalServerErrorException,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { ExportCompletedEvent, ExportFailedEvent, ExportRequestedEvent } from '../../domain/events';
import { ResumePDFService } from '../services/resume-pdf.service';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportPdfController {
  constructor(
    private readonly resumePDFService: ResumePDFService,
    private readonly logger: AppLoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(ExportPdfController.name);
  }

  @UseGuards(JwtAuthGuard)
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
  @ApiResponse({ status: 200, description: 'PDF document file' })
  @ApiResponse({ status: 400, description: 'Failed to generate PDF' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportResumePDF(
    @CurrentUser() user: UserPayload,
    @Query('palette') palette?: string,
    @Query('lang') lang?: string,
    @Query('bannerColor') bannerColor?: string,
  ): Promise<StreamableFile> {
    const exportId = randomUUID();

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
      const buffer = await this.resumePDFService.generate({
        palette,
        lang,
        bannerColor,
        userId: user.userId,
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
        palette,
        lang,
        bannerColor,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException('Failed to generate PDF. Please try again later.');
    }
  }
}
