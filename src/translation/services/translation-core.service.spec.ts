/**
 * Translation Core Service Tests
 *
 * Business Rules Tested:
 * 1. Fallback: Service failure returns original text with error flag
 * 2. Supported languages: Only PT-BR ↔ EN
 * 3. Empty/null text handling
 * 4. Service availability check
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TranslationCoreService } from './translation-core.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

describe('TranslationCoreService', () => {
  let service: TranslationCoreService;
  let httpService: HttpService;
  let configService: ConfigService;

  beforeEach(async () => {
    httpService = {
      post: mock(),
      get: mock(),
    } as any;

    configService = {
      get: mock((key: string) => {
        if (key === 'LIBRETRANSLATE_URL') return 'http://localhost:5000';
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationCoreService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TranslationCoreService>(TranslationCoreService);
  });

  describe('Fallback Behavior', () => {
    it('should return original text when service is unavailable', async () => {
      // Mark service as unavailable
      (service as any).isServiceAvailable = false;

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world'); // Returns original
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('pt');
    });

    it('should return original text on HTTP error', async () => {
      (service as any).isServiceAvailable = true;
      httpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world'); // Fallback to original
    });

    it('should return original text on timeout', async () => {
      (service as any).isServiceAvailable = true;
      httpService.post.mockReturnValue(throwError(() => new Error('Timeout')));

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world');
    });

    it('should continue main flow on translation failure', async () => {
      // Rule: Translation failure should not break main flow
      (service as any).isServiceAvailable = true;
      httpService.post.mockReturnValue(
        throwError(() => new Error('Service error')),
      );

      // This should NOT throw
      const result = await service.translate('Test text', 'pt', 'en');

      expect(result).toBeDefined();
      expect(result.translated).toBe('Test text'); // Graceful fallback
    });
  });

  describe('Successful Translation', () => {
    it('should translate PT to EN', async () => {
      (service as any).isServiceAvailable = true;
      httpService.post.mockReturnValue(
        of({
          data: { translatedText: 'Hello world' },
          status: 200,
        } as any),
      );

      const result = await service.translate('Olá mundo', 'pt', 'en');

      expect(result.original).toBe('Olá mundo');
      expect(result.translated).toBe('Hello world');
      expect(result.sourceLanguage).toBe('pt');
      expect(result.targetLanguage).toBe('en');
    });

    it('should translate EN to PT', async () => {
      (service as any).isServiceAvailable = true;
      httpService.post.mockReturnValue(
        of({
          data: { translatedText: 'Olá mundo' },
          status: 200,
        } as any),
      );

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Olá mundo');
    });
  });

  describe('Supported Languages (PT-BR and EN only)', () => {
    it('should support pt as source language', async () => {
      (service as any).isServiceAvailable = true;
      httpService.post.mockReturnValue(
        of({ data: { translatedText: 'Translated' }, status: 200 } as any),
      );

      await service.translate('Text', 'pt', 'en');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          source: 'pt',
          target: 'en',
        }),
      );
    });

    it('should support en as source language', async () => {
      (service as any).isServiceAvailable = true;
      httpService.post.mockReturnValue(
        of({ data: { translatedText: 'Traduzido' }, status: 200 } as any),
      );

      await service.translate('Text', 'en', 'pt');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          source: 'en',
          target: 'pt',
        }),
      );
    });
  });

  describe('Empty/Null Text Handling', () => {
    it('should return empty string for empty input', async () => {
      const result = await service.translate('', 'en', 'pt');

      expect(result.original).toBe('');
      expect(result.translated).toBe('');
      // Should not call API for empty text
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should return whitespace string as-is', async () => {
      const result = await service.translate('   ', 'en', 'pt');

      expect(result.original).toBe('   ');
      expect(result.translated).toBe('   ');
      expect(httpService.post).not.toHaveBeenCalled();
    });
  });

  describe('Service Availability', () => {
    it('should check service health on init', async () => {
      httpService.get.mockReturnValue(
        of({ data: { status: 'ok' }, status: 200 } as any),
      );

      const healthResult = await service.checkServiceHealth();

      expect(healthResult).toBe(true);
    });

    it('should mark service unavailable on health check failure', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Connection failed')),
      );

      const healthResult = await service.checkServiceHealth();

      expect(healthResult).toBe(false);
      expect(service.isAvailable()).toBe(false);
    });

    it('should report availability status', () => {
      (service as any).isServiceAvailable = true;
      expect(service.isAvailable()).toBe(true);

      (service as any).isServiceAvailable = false;
      expect(service.isAvailable()).toBe(false);
    });
  });
});
