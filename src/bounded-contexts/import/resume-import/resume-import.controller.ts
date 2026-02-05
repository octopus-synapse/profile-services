/**
 * Resume Import Controller
 *
 * REST API endpoints for resume import functionality.
 * MVP: JSON import. File upload (PDF/DOCX) planned.
 *
 * Robert C. Martin: "Controllers are thin - business logic belongs in services"
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { ResumeImportService } from './resume-import.service';
import type { JsonResumeSchema } from './resume-import.types';
import {
  ImportJsonDto,
  ImportResultDto,
  ParsedResumeDataDto,
} from './dto/import.dto';
import {
  toImportJobDto,
  toImportResultDto,
  toParsedResumeDataDto,
} from './mappers/import.mapper';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { ImportJobDto } from '@/shared-kernel';

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
    description:
      'Creates import job and processes JSON Resume data (jsonresume.org standard)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Import created and processing started',
    type: ImportResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid JSON Resume data - missing required fields',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async importJson(
    @CurrentUser() user: UserPayload,
    @Body() dto: ImportJsonDto,
  ): Promise<ImportResultDto> {
    this.validateJsonResume(dto.data);

    const importJob = await this.importService.createImportJob({
      userId: user.userId,
      source: 'JSON',
      rawData: dto.data,
    });

    const result = await this.importService.processImport(importJob.id);
    return toImportResultDto({
      importId: importJob.id,
      status: result.status,
      resumeId: result.resumeId,
      errors: result.errors,
    });
  }

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Parse JSON Resume without importing',
    description:
      'Validates and transforms JSON Resume to internal format without saving',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resume parsed successfully',
    type: ParsedResumeDataDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid JSON Resume format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  parseJson(@Body() dto: ImportJsonDto): ParsedResumeDataDto {
    const parsed = this.importService.parseJsonResume(dto.data);
    return toParsedResumeDataDto(parsed);
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import job details',
    type: ImportJobDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Import job not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async getStatus(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<ImportJobDto> {
    const importJob = await this.importService.getImportById(importId);
    return toImportJobDto(importJob);
  }

  @Get()
  @ApiOperation({
    summary: 'Get import history',
    description:
      'Returns all import jobs for authenticated user, ordered by creation date',
  })
  @ApiResponse({ status: 200, type: [ImportJobDto] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of import jobs',
    type: [ImportJobDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async getHistory(@CurrentUser() user: UserPayload): Promise<ImportJobDto[]> {
    const jobs = await this.importService.getImportHistory(user.userId);
    return jobs.map(toImportJobDto);
  }

  @Delete(':importId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel import job',
    description:
      'Cancels pending or processing import. Cannot cancel completed/failed imports.',
  })
  @ApiParam({
    name: 'importId',
    description: 'UUID of import job',
    example: 'uuid-v4-string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Import cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel completed or failed import',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Import job not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import retry initiated',
    type: ImportResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only retry failed imports',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Import job not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async retry(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<ImportResultDto> {
    const result = await this.importService.retryImport(importId);
    return toImportResultDto({
      importId,
      status: result.status,
      resumeId: result.resumeId,
      errors: result.errors,
    });
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
