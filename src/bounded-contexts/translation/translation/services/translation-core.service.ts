/**
 * Core Translation Service
 * Handles basic translation operations using LibreTranslate
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import {
  TranslationLanguage,
  TranslationResult,
} from '../types/translation.types';

@Injectable()
export class TranslationCoreService implements OnModuleInit {
  private readonly logger = new Logger(TranslationCoreService.name);
  private readonly libreTranslateUrl: string;
  private isServiceAvailable = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.libreTranslateUrl = this.configService.get<string>(
      'LIBRETRANSLATE_URL',
      'http://localhost:5000',
    );
  }

  async onModuleInit() {
    await this.checkServiceHealth();
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.libreTranslateUrl}/languages`)
          .pipe(timeout(5000)),
      );
      this.isServiceAvailable = response.status === 200;
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
    sourceLanguage: TranslationLanguage,
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
      this.logger.warn(
        'Translation service unavailable, returning original text',
      );
      return {
        original: text,
        translated: text,
        sourceLanguage,
        targetLanguage,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(`${this.libreTranslateUrl}/translate`, {
            q: text,
            source: sourceLanguage,
            target: targetLanguage,
            format: 'text',
          })
          .pipe(timeout(15000)),
      );

      const responseData = response.data as
        | { translatedText?: string }
        | undefined;
      const translatedText = responseData?.translatedText ?? text;
      return {
        original: text,
        translated: translatedText,
        sourceLanguage,
        targetLanguage,
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

  isAvailable(): boolean {
    return this.isServiceAvailable;
  }
}
