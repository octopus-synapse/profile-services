/**
 * Resume Import Controller
 *
 * REST API endpoints for resume import functionality.
 * MVP: JSON import. File upload (PDF/DOCX) planned.
 *
 * Robert C. Martin: "Controllers are thin - business logic belongs in services"
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import {
  ApiDataResponse,
  ApiEmptyDataResponse,
} from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ImportJobDto } from '@/shared-kernel';
import { RetryImportRequestDto } from '@/shared-kernel/dtos/sdk-request.dto';
import { ImportJsonDto, ImportResultDto, ParsedResumeDataDto } from './dto/import.dto';
import { toImportJobDto, toImportResultDto, toParsedResumeDataDto } from './mappers/import.mapper';
import { ResumeImportService } from './resume-import.service';
import type { JsonResumeSchema } from './resume-import.types';

@SdkExport({
  tag: 'resume-import',
  description: 'Resume import from JSON Resume format',
})
@ApiTags('Resume Import')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('resume-import')
export class ResumeImportController {
  constructor(private readonly importService: ResumeImportService) {}

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

    const importJob = await this.importService.createImportJob({
      userId: user.userId,
      source: 'JSON',
      rawData: dto.data,
    });

    const result = await this.importService.processImport(importJob.id);
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
  @ApiDataResponse(ParsedResumeDataDto, {
    description: 'Resume parsed successfully',
  })
  parseJson(@Body() dto: ImportJsonDto): DataResponse<ParsedResumeDataDto> {
    const parsed = this.importService.parseJsonResume(dto.data);
    return { success: true, data: toParsedResumeDataDto(parsed) };
  }

  @Get(':importId')
  @ApiOperation({
    summary: 'Get import job status',
    description: 'Returns current status, errors, and result of import job',
  })
  @ApiParam({
    name: 'importId',
    description: 'UUID of import job',
    example: 'uuid-v4-string',
  })
  @ApiDataResponse(ImportJobDto, { description: 'Import job details' })
  async getStatus(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<DataResponse<ImportJobDto>> {
    const importJob = await this.importService.getImportById(importId);
    return { success: true, data: toImportJobDto(importJob) };
  }

  @Get()
  @ApiOperation({
    summary: 'Get import history',
    description: 'Returns all import jobs for authenticated user, ordered by creation date',
  })
  @ApiDataResponse(ImportJobDto, { description: 'List of import jobs' })
  async getHistory(@CurrentUser() user: UserPayload): Promise<DataResponse<ImportJobDto[]>> {
    const jobs = await this.importService.getImportHistory(user.userId);
    return { success: true, data: jobs.map(toImportJobDto) };
  }

  @Delete(':importId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel import job',
    description: 'Cancels pending or processing import. Cannot cancel completed/failed imports.',
  })
  @ApiParam({
    name: 'importId',
    description: 'UUID of import job',
    example: 'uuid-v4-string',
  })
  @ApiEmptyDataResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Import cancelled successfully',
  })
  async cancel(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<void> {
    await this.importService.cancelImport(importId);
  }

  @Post(':importId/retry')
  @ApiOperation({
    summary: 'Retry failed import',
    description: 'Retries processing of failed import job with same data',
  })
  @ApiParam({
    name: 'importId',
    description: 'UUID of failed import job',
    example: 'uuid-v4-string',
  })
  @ApiBody({ type: RetryImportRequestDto })
  @ApiDataResponse(ImportResultDto, { description: 'Import retry initiated' })
  async retry(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<DataResponse<ImportResultDto>> {
    const result = await this.importService.retryImport(importId);
    return {
      success: true,
      data: toImportResultDto({
        importId,
        status: result.status,
        resumeId: result.resumeId,
        errors: result.errors,
      }),
    };
  }

  /**
   * Validate JSON Resume basic structure
   */
  private validateJsonResume(data: JsonResumeSchema): void {
    // JSON Resume requires at least basics section with a name
    if (!data.basics || typeof data.basics !== 'object') {
      throw new BadRequestException('Missing basics section');
    }

    if (!data.basics.name || typeof data.basics.name !== 'string') {
      throw new BadRequestException('Name is required in basics section');
    }
  }
}
