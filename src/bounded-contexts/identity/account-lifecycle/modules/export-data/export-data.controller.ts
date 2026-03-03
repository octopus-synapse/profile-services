import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AUDIT_LOGGER_PORT, type AuditLoggerPort } from '../../ports/outbound/audit-logger.port';
import {
  DATA_EXPORT_REPOSITORY_PORT,
  type DataExportRepositoryPort,
} from '../../ports/outbound/data-export-repository.port';
import { ExportDataResponseDto } from './export-data.dto';
import { ExportDataUseCase } from './export-data.use-case';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('GDPR')
@ApiBearerAuth()
@Controller('gdpr')
export class ExportDataController {
  private readonly useCase: ExportDataUseCase;

  constructor(
    @Inject(DATA_EXPORT_REPOSITORY_PORT)
    repository: DataExportRepositoryPort,
    @Inject(AUDIT_LOGGER_PORT)
    auditLogger: AuditLoggerPort,
  ) {
    this.useCase = new ExportDataUseCase(repository, auditLogger);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export user data (GDPR Article 20)',
    description: 'Exports all user data in machine-readable JSON format.',
  })
  @ApiOkResponse({
    description: 'User data export',
    type: ExportDataResponseDto,
  })
  async exportData(@Req() req: AuthenticatedRequest): Promise<ExportDataResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.useCase.execute(req.user.id, ipAddress, userAgent);
  }
}
