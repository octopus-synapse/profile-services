/**
 * Core Translation Service
 * Handles basic translation operations using LibreTranslate.
 *
 * Framework-free: takes the LibreTranslate URL as a constructor argument.
 * The composition root reads `LIBRETRANSLATE_URL` from config and calls
 * `checkServiceHealth()` once during bootstrap.
 */

import { LoggerPort } from '@/shared-kernel';
import type {
  LanguageDetectionResult,
  SourceLanguage,
  TranslationLanguage,
  TranslationResult,
} from '../../domain/types/translation.types';

const CTX = 'TranslationCoreService';

export class TranslationCoreService {
  private isServiceAvailable = false;

  constructor(
    private readonly libreTranslateUrl: string,
    private readonly logger: LoggerPort,
  ) {
    new URL(libreTranslateUrl);
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.libreTranslateUrl}/languages`, {
        signal: AbortSignal.timeout(5000),
      });
      this.isServiceAvailable = response.ok;
      this.logger.log(
        `LibreTranslate service is ${this.isServiceAvailable ? 'available' : 'unavailable'}`,
        CTX,
      );
      return this.isServiceAvailable;
    } catch {
      this.isServiceAvailable = false;
      this.logger.warn(
        'LibreTranslate service is not available. Translation features will be disabled.',
        CTX,
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
      return { original: text, translated: text, sourceLanguage, targetLanguage };
    }

    if (!this.isServiceAvailable) {
      this.logger.warn('Translation service unavailable, returning original text', CTX);
      return { original: text, translated: text, sourceLanguage, targetLanguage };
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
        signal: AbortSignal.timeout(15000),
      });

      // P2-#21: LibreTranslate sometimes returns 500/502 with an HTML
      // body. `response.json()` then throws, the catch silently returns
      // `original === translated` with no signal that anything failed.
      // Surface the upstream error so the caller can degrade explicitly.
      if (!response.ok) {
        throw new Error(`LibreTranslate ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        translatedText?: string;
        detectedLanguage?: { language?: string };
      };
      const detected = data.detectedLanguage?.language;
      const detectedLanguage =
        detected === 'pt' || detected === 'en' ? (detected as TranslationLanguage) : undefined;
      return {
        original: text,
        translated: data.translatedText ?? text,
        sourceLanguage,
        targetLanguage,
        detectedLanguage,
      };
    } catch (error) {
      this.logger.error(
        `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { context: CTX },
      );
      return { original: text, translated: text, sourceLanguage, targetLanguage };
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult[]> {
    if (!text || text.trim().length === 0 || !this.isServiceAvailable) return [];
    try {
      const response = await fetch(`${this.libreTranslateUrl}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text }),
        signal: AbortSignal.timeout(5000),
      });
      const data = (await response.json()) as LanguageDetectionResult[] | undefined;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      this.logger.error(
        `Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { context: CTX },
      );
      return [];
    }
  }

  isAvailable(): boolean {
    return this.isServiceAvailable;
  }
}
