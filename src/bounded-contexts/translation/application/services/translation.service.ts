/**
 * Translation Service (Facade)
 * Provides unified API for translation operations
 * Delegates to specialized services for implementation
 */

import type {
  BatchTranslationResult,
  LanguageDetectionResult,
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../../domain/types/translation.types';
import { ResumeTranslationService } from './resume-translation.service';
import { TranslationBatchService } from './translation-batch.service';
import { TranslationCoreService } from './translation-core.service';

export class TranslationService {
  constructor(
    private readonly coreService: TranslationCoreService,
    private readonly batchService: TranslationBatchService,
    private readonly resumeService: ResumeTranslationService,
  ) {}

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
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult> {
    return this.coreService.translate(text, sourceLanguage, targetLanguage);
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult[]> {
    return this.coreService.detectLanguage(text);
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult> {
    return this.batchService.translateBatch(texts, sourceLanguage, targetLanguage);
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
