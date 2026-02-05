/**
 * Export DOCX Controller
 * Handles DOCX resume export
 */

import {
  Controller,
  Get,
  UseGuards,
  StreamableFile,
  Header,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProduces,
} from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { ResumeDOCXService } from '../services/resume-docx.service';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  ExportRequestedEvent,
  ExportCompletedEvent,
  ExportFailedEvent,
} from '../../domain/events';
import {
  ExportResultDto,
} from '@/shared-kernel';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportDocxController {
  constructor(
    private readonly resumeDOCXService: ResumeDOCXService,
    private readonly logger: AppLoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(ExportDocxController.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('resume/docx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @Header('Content-Disposition', 'attachment; filename="resume.docx"')
  @ApiOperation({ summary: 'Export resume as DOCX document' })
  @ApiResponse({ status: 200, type: ExportResultDto })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @ApiResponse({ status: 200, description: 'DOCX document file' })
  @ApiResponse({ status: 400, description: 'Failed to generate DOCX' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportResumeDOCX(
    @CurrentUser() user: UserPayload,
  ): Promise<StreamableFile> {
    const exportId = randomUUID();

    // Emit export requested event before processing
    this.eventEmitter.emit(
      ExportRequestedEvent.TYPE,
      new ExportRequestedEvent(exportId, {
        resumeId: user.userId, // Using userId as resumeId (1:1 relationship)
        userId: user.userId,
        format: 'docx',
      }),
    );

    try {
      const buffer = await this.resumeDOCXService.generate(user.userId);

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

      this.logger.errorWithMeta('Failed to generate DOCX', {
        userId: user.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new InternalServerErrorException(
        'Failed to generate DOCX. Please try again later.',
      );
    }
  }
}
