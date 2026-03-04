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
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiStreamResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { EventPublisher } from '@/shared-kernel';
import { ExportCompletedEvent, ExportFailedEvent, ExportRequestedEvent } from '../domain/events';
import { BannerCaptureService } from './services/banner-capture.service';
import { ResumeDOCXService } from './services/resume-docx.service';
import { ResumePDFService } from './services/resume-pdf.service';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportController {
  constructor(
    private readonly bannerCaptureService: BannerCaptureService,
    private readonly resumePDFService: ResumePDFService,
    private readonly resumeDOCXService: ResumeDOCXService,
    private readonly logger: AppLoggerService,
    private readonly eventPublisher: EventPublisher,
  ) {
    this.logger.setContext(ExportController.name);
  }

  @UseGuards(JwtAuthGuard)
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
    try {
      const buffer = await this.bannerCaptureService.capture(palette, logoUrl);
      return new StreamableFile(buffer);
    } catch (error) {
      this.logger.errorWithMeta('Failed to generate banner', {
        palette,
        logoUrl,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException('Failed to generate banner. Please try again later.');
    }
  }

  @UseGuards(JwtAuthGuard)
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

    this.eventPublisher.publish(
      new ExportRequestedEvent(exportId, {
        resumeId: 'user-default',
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
        palette,
        lang,
        bannerColor,
        error: reason,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException('Failed to generate PDF. Please try again later.');
    }
  }

  @UseGuards(JwtAuthGuard)
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
      const buffer = await this.resumeDOCXService.generate(user.userId);

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
}
