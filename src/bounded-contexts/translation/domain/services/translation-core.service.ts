/**
 * Core Translation Service (Domain Service)
 * Handles basic translation operations using LibreTranslate
 */

import type { LoggerPort } from '../ports/logger.port';
import type {
  LanguageDetectionResult,
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../types/translation.types';

export class TranslationCoreService {
  private readonly libreTranslateUrl: string;
  private readonly timeoutMs: number;
  private isServiceAvailable = false;

  constructor(
    private readonly logger: LoggerPort,
    libreTranslateUrl?: string,
  ) {
    this.libreTranslateUrl = libreTranslateUrl ?? 'http://libretranslate:5000';
    this.timeoutMs = 30_000;
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.libreTranslateUrl}/languages`, {
        signal: AbortSignal.timeout(5000),
      });
      this.isServiceAvailable = response.ok;
      this.logger.log(
        `LibreTranslate service is ${this.isServiceAvailable ? 'available' : 'unavailable'}`,
      );
      return this.isServiceAvailable;
    } catch {
      this.isServiceAvailable = false;
      this.logger.warn(
        'LibreTranslate service is not available. Translation features will be disabled.',
      );
      return false;
    }
  }

  async translate(
    text: string,
    sourceLanguage: SourceLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }

    if (!this.isServiceAvailable) {
      this.logger.warn('Translation service unavailable, returning original text');
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }

    try {
      const response = await fetch(`${this.libreTranslateUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text',
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const responseData = (await response.json()) as
        | { translatedText?: string; detectedLanguage?: { language?: string } }
        | undefined;
      const translatedText = responseData?.translatedText ?? text;
      const detected = responseData?.detectedLanguage?.language;
      const detectedLanguage =
        detected === 'pt' || detected === 'en' ? (detected as TranslationLanguage) : undefined;
      return {
        original: text,
        translated: translatedText,
        sourceLanguage,
        targetLanguage,
        detectedLanguage,
      };
    } catch (error) {
      this.logger.error(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult[]> {
    if (!text || text.trim().length === 0 || !this.isServiceAvailable) {
      return [];
    }
    try {
      const response = await fetch(`${this.libreTranslateUrl}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const data = (await response.json()) as LanguageDetectionResult[] | undefined;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      this.logger.error(
        `Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  isAvailable(): boolean {
    return this.isServiceAvailable;
  }
}
