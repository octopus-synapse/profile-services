import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { LoggerPort } from '@/shared-kernel';
import { ExportDataResponseDto } from '../../application/use-cases/export-data/export-data.dto';
import { ExportDataUseCase } from '../../application/use-cases/export-data/export-data.use-case';
import { AuditLoggerPort } from '../../domain/ports/audit-logger.port';
import { DataExportRepositoryPort } from '../../domain/ports/data-export-repository.port';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@SdkExport({ tag: 'user-consent', description: 'GDPR Export API' })
@ApiTags('GDPR')
@ApiBearerAuth()
@Controller('gdpr')
export class ExportDataController {
  private readonly useCase: ExportDataUseCase;

  constructor(
    repository: DataExportRepositoryPort,
    auditLogger: AuditLoggerPort,
    logger: LoggerPort,
  ) {
    this.useCase = new ExportDataUseCase(repository, auditLogger, logger);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export user data (GDPR Article 20)',
    description: 'Exports all user data in machine-readable JSON format.',
  })
  @ApiDataResponse(ExportDataResponseDto, { description: 'User data export' })
  async exportData(@Req() req: AuthenticatedRequest): Promise<ExportDataResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.useCase.execute(req.user.id, ipAddress, userAgent);
  }
}
