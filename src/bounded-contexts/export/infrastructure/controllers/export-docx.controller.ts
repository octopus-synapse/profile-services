/**
 * Export DOCX Controller
 * Handles DOCX resume export. Lifecycle (Requested/Completed/Failed events
 * + 500 translation) lives in `ExportPipelineService`; the handler is a wire.
 */

import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiStreamResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { ExportUseCases } from '../../application/ports/export.port';
import { ExportPipelineService } from '../../application/services/export-pipeline.service';

@SdkExport({ tag: 'export', description: 'Export API' })
@ApiTags('export')
@ApiBearerAuth('JWT-auth')
@Controller('v1/export')
export class ExportDocxController {
  constructor(
    private readonly useCases: ExportUseCases,
    private readonly pipeline: ExportPipelineService,
  ) {}

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
    const buffer = await this.pipeline.run('docx', user.userId, () =>
      this.useCases.exportDocxUseCase.execute({ userId: user.userId }),
    );
    return new StreamableFile(buffer);
  }
}
