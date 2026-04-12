/**
 * Export DOCX Controller
 * Handles DOCX resume export
 */

import { randomUUID } from 'node:crypto';
import {
  Controller,
  Get,
  Header,
  Inject,
  InternalServerErrorException,
  StreamableFile,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiStreamResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { EXPORT_USE_CASES, type ExportUseCases } from '../../application/ports/export.port';
import { ExportCompletedEvent, ExportFailedEvent, ExportRequestedEvent } from '../../domain/events';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportDocxController {
  constructor(
    @Inject(EXPORT_USE_CASES)
    private readonly useCases: ExportUseCases,
    private readonly logger: AppLoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(ExportDocxController.name);
  }

  @RequirePermission(Permission.RESUME_EXPORT)
  @Get('resume/docx')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  @Header('Content-Disposition', 'attachment; filename="resume.docx"')
  @ApiOperation({ summary: 'Export resume as DOCX document' })
  @ApiStreamResponse({
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'DOCX document file',
  })
  @ApiProduces('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  async exportResumeDOCX(@CurrentUser() user: UserPayload): Promise<StreamableFile> {
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
      const buffer = await this.useCases.exportDocxUseCase.execute({ userId: user.userId });

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
      throw new InternalServerErrorException('Failed to generate DOCX. Please try again later.');
    }
  }
}
