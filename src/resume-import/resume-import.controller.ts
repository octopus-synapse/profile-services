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
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/auth-request.interface';
import { ResumeImportService } from './resume-import.service';
import type {
  JsonResumeSchema,
  ImportResult,
  ParsedResumeData,
} from './resume-import.types';

/**
 * DTO for JSON import
 */
class ImportJsonDto {
  data!: JsonResumeSchema;
}

@ApiTags('Resume Import')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('resume-import')
export class ResumeImportController {
  constructor(private readonly importService: ResumeImportService) {}

  @Post('json')
  @ApiOperation({ summary: 'Import resume from JSON Resume format' })
  @ApiBody({ description: 'JSON Resume data' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Import successful',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid JSON data',
  })
  async importJson(
    @CurrentUser() user: UserPayload,
    @Body() dto: ImportJsonDto,
  ): Promise<ImportResult> {
    this.validateJsonResume(dto.data);

    const importJob = await this.importService.createImportJob({
      userId: user.userId,
      source: 'JSON',
      rawData: dto.data,
    });

    return this.importService.processImport(importJob.id);
  }

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse JSON Resume without saving' })
  @ApiBody({ description: 'JSON Resume data to parse' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Parsed resume data',
  })
  async parseJson(@Body() dto: ImportJsonDto): Promise<ParsedResumeData> {
    return this.importService.parseJsonResume(dto.data);
  }

  @Get(':importId')
  @ApiOperation({ summary: 'Get import status' })
  @ApiParam({ name: 'importId', description: 'Import job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import status',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Import not found',
  })
  async getStatus(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ) {
    return this.importService.getImportStatus(importId);
  }

  @Get()
  @ApiOperation({ summary: 'Get import history for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import history',
  })
  async getHistory(@CurrentUser() user: UserPayload) {
    return this.importService.getImportHistory(user.userId);
  }

  @Delete(':importId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel pending import' })
  @ApiParam({ name: 'importId', description: 'Import job ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Import cancelled',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel completed import',
  })
  async cancel(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<void> {
    await this.importService.cancelImport(importId);
  }

  @Post(':importId/retry')
  @ApiOperation({ summary: 'Retry failed import' })
  @ApiParam({ name: 'importId', description: 'Import job ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import retried successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Can only retry failed imports',
  })
  async retry(
    @CurrentUser() _user: UserPayload,
    @Param('importId') importId: string,
  ): Promise<ImportResult> {
    return this.importService.retryImport(importId);
  }

  /**
   * Validate JSON Resume basic structure
   */
  private validateJsonResume(data: JsonResumeSchema): void {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Invalid JSON data');
    }

    // JSON Resume requires at least basics section with a name
    if (!data.basics || typeof data.basics !== 'object') {
      throw new BadRequestException('Missing basics section');
    }

    if (!data.basics.name || typeof data.basics.name !== 'string') {
      throw new BadRequestException('Name is required in basics section');
    }
  }
}
