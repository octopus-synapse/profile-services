/**
 * Translation Controller
 * REST API endpoints for translation services
 */

import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { TranslationService } from '../../application/services';
import type {
  LanguageDetectionResult,
  SourceLanguage,
  TranslationLanguage,
} from '../../domain/types/translation.types';
import {
  BatchTranslationResultDto,
  HealthCheckResponseDto,
  TranslateBatchDto,
  TranslateSimpleDto,
  TranslateTextDto,
  TranslationResultDto,
} from './dto';

@SdkExport({ tag: 'translation', description: 'Translation API' })
@ApiTags('Translation')
@Controller('v1/translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Check translation service health' })
  @ApiDataResponse(HealthCheckResponseDto, {
    description: 'Service health status',
  })
  async healthCheck(): Promise<DataResponse<HealthCheckResponseDto>> {
    const isAvailable = await this.translationService.checkServiceHealth();
    return {
      success: true,
      data: {
        status: isAvailable ? 'healthy' : 'unavailable',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('text')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate a single text' })
  @ApiDataResponse(TranslationResultDto, {
    status: 201,
    description: 'Translation result',
  })
  async translateText(@Body() dto: TranslateTextDto): Promise<DataResponse<TranslationResultDto>> {
    const result = await this.translationService.translate(
      dto.text,
      dto.sourceLanguage as SourceLanguage,
      dto.targetLanguage as TranslationLanguage,
    );
    return { success: true, data: result };
  }

  @Post('detect')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detect the language of a text' })
  async detect(
    @Body() dto: TranslateSimpleDto,
  ): Promise<DataResponse<{ detections: LanguageDetectionResult[] }>> {
    const detections = await this.translationService.detectLanguage(dto.text);
    return { success: true, data: { detections } };
  }

  @Post('batch')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate multiple texts in batch' })
  @ApiDataResponse(BatchTranslationResultDto, {
    status: 201,
    description: 'Batch translation results',
  })
  async translateBatch(
    @Body() dto: TranslateBatchDto,
  ): Promise<DataResponse<BatchTranslationResultDto>> {
    const result = await this.translationService.translateBatch(
      dto.texts,
      dto.sourceLanguage as SourceLanguage,
      dto.targetLanguage as TranslationLanguage,
    );
    return { success: true, data: result };
  }

  @Post('pt-to-en')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate Portuguese to English' })
  @ApiBody({ type: TranslateSimpleDto })
  @ApiDataResponse(TranslationResultDto, {
    status: 201,
    description: 'Translation result',
  })
  async translatePtToEn(
    @Body() body: TranslateSimpleDto,
  ): Promise<DataResponse<TranslationResultDto>> {
    const result = await this.translationService.translatePtToEn(body.text);
    return { success: true, data: result };
  }

  @Post('en-to-pt')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate English to Portuguese' })
  @ApiBody({ type: TranslateSimpleDto })
  @ApiDataResponse(TranslationResultDto, {
    status: 201,
    description: 'Translation result',
  })
  async translateEnToPt(
    @Body() body: TranslateSimpleDto,
  ): Promise<DataResponse<TranslationResultDto>> {
    const result = await this.translationService.translateEnToPt(body.text);
    return { success: true, data: result };
  }
}
