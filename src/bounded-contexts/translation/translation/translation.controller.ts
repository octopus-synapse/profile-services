/**
 * Translation Controller
 * REST API endpoints for translation services
 */

import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { TranslateBatch, TranslateText } from '@/shared-kernel';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { TranslateSimpleRequestDto } from '@/shared-kernel/dtos/sdk-request.dto';
import { HealthCheckResponseDto } from '@/shared-kernel/dtos/sdk-response.dto';
import { TranslationService } from './translation.service';
import type { TranslationLanguage } from './types/translation.types';

/** DTO for translation result - matches actual service response */
export class TranslationResultDto {
  @ApiProperty({ example: 'Hello world' })
  original!: string;

  @ApiProperty({ example: 'Olá mundo' })
  translated!: string;

  @ApiProperty({ example: 'en' })
  sourceLanguage!: string;

  @ApiProperty({ example: 'pt' })
  targetLanguage!: string;
}

/** DTO for failed translation item */
export class FailedTranslationDto {
  @ApiProperty({ example: 'Invalid text' })
  text!: string;

  @ApiProperty({ example: 'Translation failed' })
  error!: string;
}

/** DTO for batch translation result - matches actual service response */
export class BatchTranslationResultDto {
  @ApiProperty({ type: [TranslationResultDto] })
  translations!: TranslationResultDto[];

  @ApiProperty({ type: [FailedTranslationDto] })
  failed!: FailedTranslationDto[];
}

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
  async translateText(@Body() dto: TranslateText): Promise<DataResponse<TranslationResultDto>> {
    const result = await this.translationService.translate(
      dto.text,
      dto.sourceLanguage as TranslationLanguage,
      dto.targetLanguage as TranslationLanguage,
    );
    return { success: true, data: result };
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
    @Body() dto: TranslateBatch,
  ): Promise<DataResponse<BatchTranslationResultDto>> {
    const result = await this.translationService.translateBatch(
      dto.texts,
      dto.sourceLanguage as TranslationLanguage,
      dto.targetLanguage as TranslationLanguage,
    );
    return { success: true, data: result };
  }

  @Post('pt-to-en')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate Portuguese to English' })
  @ApiBody({ type: TranslateSimpleRequestDto })
  @ApiDataResponse(TranslationResultDto, {
    status: 201,
    description: 'Translation result',
  })
  async translatePtToEn(
    @Body() body: TranslateSimpleRequestDto,
  ): Promise<DataResponse<TranslationResultDto>> {
    const result = await this.translationService.translatePtToEn(body.text);
    return { success: true, data: result };
  }

  @Post('en-to-pt')
  @RequirePermission(Permission.RESUME_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate English to Portuguese' })
  @ApiBody({ type: TranslateSimpleRequestDto })
  @ApiDataResponse(TranslationResultDto, {
    status: 201,
    description: 'Translation result',
  })
  async translateEnToPt(
    @Body() body: TranslateSimpleRequestDto,
  ): Promise<DataResponse<TranslationResultDto>> {
    const result = await this.translationService.translateEnToPt(body.text);
    return { success: true, data: result };
  }
}
