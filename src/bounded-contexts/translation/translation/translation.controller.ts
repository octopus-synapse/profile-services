/**
 * Translation Controller
 * REST API endpoints for translation services
 */

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import type { TranslateBatch, TranslateText } from '@/shared-kernel';
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate Portuguese to English' })
  @ApiDataResponse(TranslationResultDto, {
    status: 201,
    description: 'Translation result',
  })
  async translatePtToEn(@Body('text') text: string): Promise<DataResponse<TranslationResultDto>> {
    const result = await this.translationService.translatePtToEn(text);
    return { success: true, data: result };
  }

  @Post('en-to-pt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate English to Portuguese' })
  @ApiDataResponse(TranslationResultDto, {
    status: 201,
    description: 'Translation result',
  })
  async translateEnToPt(@Body('text') text: string): Promise<DataResponse<TranslationResultDto>> {
    const result = await this.translationService.translateEnToPt(text);
    return { success: true, data: result };
  }
}
