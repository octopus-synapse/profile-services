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
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
import { GithubImportService } from '../adapters/github-import.service';
import { PdfImportService } from '../adapters/pdf-import.service';
import {
  ImportJobDto,
  ImportJsonDto,
  ImportResultDto,
  ParsedResumeDataDto,
  RetryImportRequestDto,
} from '../dto';
import {
  toImportJobDto,
  toImportJobDtoList,
  toImportResultDto,
  toParsedResumeDataDto,
} from '../mappers/import.mapper';

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
    private readonly pdfImport: PdfImportService,
    private readonly githubImport: GithubImportService,
  ) {}

  @Post('pdf')
  @ApiOperation({
    summary: 'Import resume from a PDF file',
    description:
      'Accepts a PDF upload (multipart/form-data, field name `file`), extracts the text with pdf-parse and structures it with the LLM. Creates a Resume row and marks it as primary when the user has none.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Binary PDF payload',
    required: true,
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file (max 5MB)',
        },
      },
    },
  })
  @ApiDataResponse(ImportResultDto, {
    status: HttpStatus.CREATED,
    description: 'CV imported from PDF',
  })
  @UseInterceptors(FileInterceptor('file'))
  async importPdf(
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<DataResponse<{ resumeId: string }>> {
    if (!file) {
      throw new BadRequestException('Missing file (multipart field "file")');
    }
    const result = await this.pdfImport.import(user.userId, {
      buffer: file.buffer,
      originalname: file.originalname,
    });
    return { success: true, data: { resumeId: result.resumeId } };
  }

  @Post('github')
  @ApiOperation({
    summary: 'Import profile data from GitHub',
    description:
      "Uses the user's previously-connected GitHub OAuth token to fetch top repos and derive skills + BUILD posts. Fails with 409 GITHUB_NOT_CONNECTED if the user hasn't linked GitHub yet.",
  })
  @ApiDataResponse(ImportResultDto, {
    status: HttpStatus.OK,
    description: 'GitHub data imported',
  })
  async importGithub(@CurrentUser() user: UserPayload): Promise<
    DataResponse<{
      primaryStack: string[];
      buildPostsCreated: number;
      profileUpdated: boolean;
    }>
  > {
    const result = await this.githubImport.import(user.userId);
    return {
      success: true,
      data: {
        primaryStack: result.primaryStack,
        buildPostsCreated: result.buildPostsCreated,
        profileUpdated: result.profileUpdated,
      },
    };
  }

  @Post('linkedin')
  @ApiOperation({
    summary: 'Import profile data from LinkedIn (scaffold)',
    description:
      "Placeholder endpoint. Returns 503 until the LinkedIn v2 API client lands. Frontend should treat this as 'em breve' for now.",
  })
  async importLinkedin(): Promise<DataResponse<{ status: 'not_implemented' }>> {
    // We keep the route live so the UI can call `available` and get a clean
    // 503 rather than a 404 — this also reminds us where the work lands.
    throw new ServiceUnavailableException('LinkedIn import not implemented yet');
  }

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
    return { success: true, data: toImportJobDtoList(jobs) };
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
