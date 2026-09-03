/**
 * Translation Service (Facade)
 *
 * What the HTTP surface and other bounded contexts call. The raw text/batch
 * endpoints and their use cases are gone (no client; a general-purpose
 * translator billed to any account was the wrong shape); what remains is
 * health, language detection, single-text translation for internal callers,
 * and the whole-object resume translation the bilingual write-through uses.
 */

import type {
  LanguageDetectionResult,
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../../domain/types/translation.types';
import { ResumeTranslationService } from './resume-translation.service';
import { TranslationCoreService } from './translation-core.service';

export class TranslationService {
  constructor(
    private readonly coreService: TranslationCoreService,
    private readonly resumeService: ResumeTranslationService,
  ) {}

  async checkServiceHealth(): Promise<boolean> {
    return this.coreService.checkServiceHealth();
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
