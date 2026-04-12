/**
 * Resume Import Controller
 *
 * REST API endpoints for resume import functionality.
 * Thin controller — delegates to use-cases.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import type { CancelImportUseCase } from '../../application/use-cases/cancel-import/cancel-import.use-case';
import type { CreateImportJobUseCase } from '../../application/use-cases/create-import-job/create-import-job.use-case';
import type { GetImportStatusUseCase } from '../../application/use-cases/get-import-status/get-import-status.use-case';
import type { ListImportHistoryUseCase } from '../../application/use-cases/list-import-history/list-import-history.use-case';
import type { ProcessImportUseCase } from '../../application/use-cases/process-import/process-import.use-case';
import type { RetryImportUseCase } from '../../application/use-cases/retry-import/retry-import.use-case';
import {
  ImportCannotBeCancelledException,
  ImportCannotBeRetriedException,
  ImportNotFoundException,
} from '../../domain/exceptions/import.exceptions';
import { JsonResumeParser } from '../../domain/services/json-resume-parser';
import type { JsonResumeSchema } from '../../domain/types/import.types';
import {
  ImportJobDto,
  ImportJsonDto,
  ImportResultDto,
  ParsedResumeDataDto,
  RetryImportRequestDto,
} from '../dto';
import { toImportJobDto, toImportResultDto, toParsedResumeDataDto } from '../mappers/import.mapper';

// Use-case injection tokens
export const CREATE_IMPORT_JOB = Symbol('CreateImportJobUseCase');
export const PROCESS_IMPORT = Symbol('ProcessImportUseCase');
export const GET_IMPORT_STATUS = Symbol('GetImportStatusUseCase');
export const LIST_IMPORT_HISTORY = Symbol('ListImportHistoryUseCase');
export const CANCEL_IMPORT = Symbol('CancelImportUseCase');
export const RETRY_IMPORT = Symbol('RetryImportUseCase');

@SdkExport({
  tag: 'resume-import',
  description: 'Resume import from JSON Resume format',
})
@ApiTags('Resume Import')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.RESUME_IMPORT)
@Controller('resume-import')
export class ResumeImportController {
  private readonly parser = new JsonResumeParser();

  constructor(
    @Inject(CREATE_IMPORT_JOB) private readonly createImportJob: CreateImportJobUseCase,
    @Inject(PROCESS_IMPORT) private readonly processImport: ProcessImportUseCase,
    @Inject(GET_IMPORT_STATUS) private readonly getImportStatus: GetImportStatusUseCase,
    @Inject(LIST_IMPORT_HISTORY) private readonly listImportHistory: ListImportHistoryUseCase,
    @Inject(CANCEL_IMPORT) private readonly cancelImport: CancelImportUseCase,
    @Inject(RETRY_IMPORT) private readonly retryImport: RetryImportUseCase,
  ) {}

  @Post('json')
  @ApiOperation({
    summary: 'Import resume from JSON Resume format',
    description: 'Creates import job and processes JSON Resume data (jsonresume.org standard)',
  })
  @ApiDataResponse(ImportResultDto, {
    status: HttpStatus.CREATED,
    description: 'Import created and processing started',
  })
  async importJson(
    @CurrentUser() user: UserPayload,
    @Body() dto: ImportJsonDto,
  ): Promise<DataResponse<ImportResultDto>> {
    this.validateJsonResume(dto.data);

    const importJob = await this.createImportJob.execute({
      userId: user.userId,
      source: 'JSON',
      rawData: dto.data,
    });

    const result = await this.processImport.execute(importJob.id);
    return {
      success: true,
      data: toImportResultDto({
        importId: importJob.id,
        status: result.status,
        resumeId: result.resumeId,
        errors: result.errors,
      }),
    };
  }

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Parse JSON Resume without importing',
    description: 'Validates and transforms JSON Resume to internal format without saving',
  })
  @ApiDataResponse(ParsedResumeDataDto, { description: 'Resume parsed successfully' })
  parseJson(@Body() dto: ImportJsonDto): DataResponse<ParsedResumeDataDto> {
    const parsed = this.parser.parse(dto.data);
    return { success: true, data: toParsedResumeDataDto(parsed) };
  }

  @Get(':importId')
  @ApiOperation({
    summary: 'Get import job status',
    description: 'Returns current status, errors, and result of import job',
  })
  @ApiParam({ name: 'importId', description: 'UUID of import job' })
  @ApiDataResponse(ImportJobDto, { description: 'Import job details' })
  async getStatus(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<DataResponse<ImportJobDto>> {
    try {
      const importJob = await this.getImportStatus.execute(importId);
      return { success: true, data: toImportJobDto(importJob) };
    } catch (error) {
      if (error instanceof ImportNotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get import history',
    description: 'Returns all import jobs for authenticated user, ordered by creation date',
  })
  @ApiDataResponse(ImportJobDto, { description: 'List of import jobs' })
  async getHistory(@CurrentUser() user: UserPayload): Promise<DataResponse<ImportJobDto[]>> {
    const jobs = await this.listImportHistory.execute(user.userId);
    return { success: true, data: jobs.map(toImportJobDto) };
  }

  @Delete(':importId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel import job',
    description: 'Cancels pending or processing import. Cannot cancel completed imports.',
  })
  @ApiParam({ name: 'importId', description: 'UUID of import job' })
  @ApiEmptyDataResponse({ status: HttpStatus.NO_CONTENT, description: 'Import cancelled' })
  async cancel(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<void> {
    try {
      await this.cancelImport.execute(importId);
    } catch (error) {
      if (error instanceof ImportNotFoundException) throw new NotFoundException(error.message);
      if (error instanceof ImportCannotBeCancelledException)
        throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Post(':importId/retry')
  @ApiOperation({
    summary: 'Retry failed import',
    description: 'Retries processing of failed import job with same data',
  })
  @ApiParam({ name: 'importId', description: 'UUID of failed import job' })
  @ApiBody({ type: RetryImportRequestDto })
  @ApiDataResponse(ImportResultDto, { description: 'Import retry initiated' })
  async retry(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<DataResponse<ImportResultDto>> {
    try {
      const result = await this.retryImport.execute(importId);
      return {
        success: true,
        data: toImportResultDto({
          importId,
          status: result.status,
          resumeId: result.resumeId,
          errors: result.errors,
        }),
      };
    } catch (error) {
      if (error instanceof ImportNotFoundException) throw new NotFoundException(error.message);
      if (error instanceof ImportCannotBeRetriedException)
        throw new BadRequestException(error.message);
      throw error;
    }
  }

  private validateJsonResume(data: JsonResumeSchema): void {
    if (!data.basics || typeof data.basics !== 'object') {
      throw new BadRequestException('Missing basics section');
    }
    if (!data.basics.name || typeof data.basics.name !== 'string') {
      throw new BadRequestException('Name is required in basics section');
    }
  }
}
