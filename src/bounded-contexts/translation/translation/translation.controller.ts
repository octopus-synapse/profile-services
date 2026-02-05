/**
 * Translation Controller
 * REST API endpoints for translation services
 */

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  BatchTranslationResponseDto,
  HealthCheckResponseDto,
  TranslationResponseDto,
} from '@/shared-kernel/dtos/sdk-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { TranslationService, TranslationLanguage } from './translation.service';
import type { TranslateText, TranslateBatch } from '@/shared-kernel';

@SdkExport({ tag: 'translation', description: 'Translation API' })
@ApiTags('Translation')
@Controller('v1/translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check translation service health' })
  @ApiResponse({ status: 200, type: HealthCheckResponseDto })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async healthCheck() {
    const isAvailable = await this.translationService.checkServiceHealth();
    return {
      status: isAvailable ? 'healthy' : 'unavailable',
      service: 'opus-mt',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('text')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate a single text' })
  @ApiResponse({ status: 201, type: TranslationResponseDto })
  @ApiResponse({ status: 200, description: 'Translation result' })
  async translateText(@Body() dto: TranslateText) {
    const result = await this.translationService.translate(
      dto.text,
      dto.sourceLanguage as TranslationLanguage,
      dto.targetLanguage as TranslationLanguage,
    );
    return result;
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate multiple texts in batch' })
  @ApiResponse({ status: 201, type: BatchTranslationResponseDto })
  @ApiResponse({ status: 200, description: 'Batch translation results' })
  async translateBatch(@Body() dto: TranslateBatch) {
    const result = await this.translationService.translateBatch(
      dto.texts,
      dto.sourceLanguage as TranslationLanguage,
      dto.targetLanguage as TranslationLanguage,
    );
    return result;
  }

  @Post('pt-to-en')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate Portuguese to English' })
  @ApiResponse({ status: 201, type: TranslationResponseDto })
  @ApiResponse({ status: 200, description: 'Translation result' })
  async translatePtToEn(@Body('text') text: string) {
    return this.translationService.translatePtToEn(text);
  }

  @Post('en-to-pt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Translate English to Portuguese' })
  @ApiResponse({ status: 201, type: TranslationResponseDto })
  @ApiResponse({ status: 200, description: 'Translation result' })
  async translateEnToPt(@Body('text') text: string) {
    return this.translationService.translateEnToPt(text);
  }
}
