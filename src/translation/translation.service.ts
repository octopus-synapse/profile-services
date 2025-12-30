/**
 * Translation Service (Facade)
 * Provides unified API for translation operations
 * Delegates to specialized services for implementation
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  TranslationCoreService,
  TranslationBatchService,
  ResumeTranslationService,
} from './services';
import {
  TranslationLanguage,
  TranslationResult,
  BatchTranslationResult,
} from './types/translation.types';

// Re-export types for backward compatibility
export { TranslationLanguage, TranslationResult, BatchTranslationResult };

@Injectable()
export class TranslationService implements OnModuleInit {
  constructor(
    private readonly coreService: TranslationCoreService,
    private readonly batchService: TranslationBatchService,
    private readonly resumeService: ResumeTranslationService,
  ) {}

  async onModuleInit() {
    await this.coreService.checkServiceHealth();
  }

  async checkServiceHealth(): Promise<boolean> {
    return this.coreService.checkServiceHealth();
  }

  async translatePtToEn(text: string): Promise<TranslationResult> {
    return this.coreService.translate(text, 'pt', 'en');
  }

  async translateEnToPt(text: string): Promise<TranslationResult> {
    return this.coreService.translate(text, 'en', 'pt');
  }

  async translate(
    text: string,
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult> {
    return this.coreService.translate(text, sourceLanguage, targetLanguage);
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult> {
    return this.batchService.translateBatch(
      texts,
      sourceLanguage,
      targetLanguage,
    );
  }

  async translateResumeToEnglish(
    resumeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.resumeService.translateToEnglish(resumeData);
  }

  async translateResumeToPortuguese(
    resumeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.resumeService.translateToPortuguese(resumeData);
  }

  isAvailable(): boolean {
    return this.coreService.isAvailable();
  }
}
