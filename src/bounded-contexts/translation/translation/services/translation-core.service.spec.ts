/**
 * Translation Core Service Tests
 *
 * Clean architecture: Stub HttpService, Pure Bun tests
 *
 * Business Rules Tested:
 * 1. Fallback: Service failure returns original text with error flag
 * 2. Supported languages: Only PT-BR ↔ EN
 * 3. Empty/null text handling
 * 4. Service availability check
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { AxiosResponse } from 'axios';
import { type Observable, of, throwError } from 'rxjs';
import { TranslationCoreService } from './translation-core.service';

/**
 * Stub HttpService for testing
 */
class StubHttpService {
  private postResult: Observable<AxiosResponse<unknown>> = of({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  });
  private getResult: Observable<AxiosResponse<unknown>> = of({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  });

  calls: Array<{ method: string; args: unknown[] }> = [];

  setPostResult(result: Observable<AxiosResponse<unknown>>): void {
    this.postResult = result;
  }

  setGetResult(result: Observable<AxiosResponse<unknown>>): void {
    this.getResult = result;
  }

  setPostError(error: Error): void {
    this.postResult = throwError(() => error);
  }

  setGetError(error: Error): void {
    this.getResult = throwError(() => error);
  }

  post(url: string, data?: unknown): Observable<AxiosResponse<unknown>> {
    this.calls.push({ method: 'post', args: [url, data] });
    return this.postResult;
  }

  get(url: string): Observable<AxiosResponse<unknown>> {
    this.calls.push({ method: 'get', args: [url] });
    return this.getResult;
  }

  getCallsFor(method: string): Array<{ method: string; args: unknown[] }> {
    return this.calls.filter((c) => c.method === method);
  }
}

/**
 * Stub ConfigService
 */
const stubConfigService = {
  get: (key: string, defaultValue?: string): string | undefined => {
    if (key === 'LIBRETRANSLATE_URL') return 'http://localhost:5000';
    return defaultValue;
  },
};

describe('TranslationCoreService', () => {
  let service: TranslationCoreService;
  let stubHttpService: StubHttpService;

  beforeEach(() => {
    stubHttpService = new StubHttpService();
    service = new TranslationCoreService(stubConfigService as never, stubHttpService as never);
  });

  describe('Fallback Behavior', () => {
    it('should return original text when service is unavailable', async () => {
      // Mark service as unavailable
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = false;

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world'); // Returns original
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('pt');
    });

    it('should return original text on HTTP error', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      stubHttpService.setPostError(new Error('Connection refused'));

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world'); // Fallback to original
    });

    it('should return original text on timeout', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      stubHttpService.setPostError(new Error('Timeout'));

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world');
    });

    it('should continue main flow on translation failure', async () => {
      // Rule: Translation failure should not break main flow
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      stubHttpService.setPostError(new Error('Service error'));

      // This should NOT throw
      const result = await service.translate('Test text', 'pt', 'en');

      expect(result).toBeDefined();
      expect(result.translated).toBe('Test text'); // Graceful fallback
    });
  });

  describe('Successful Translation', () => {
    it('should translate PT to EN', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      stubHttpService.setPostResult(
        of({
          data: { translatedText: 'Hello world' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.translate('Olá mundo', 'pt', 'en');

      expect(result.original).toBe('Olá mundo');
      expect(result.translated).toBe('Hello world');
      expect(result.sourceLanguage).toBe('pt');
      expect(result.targetLanguage).toBe('en');
    });

    it('should translate EN to PT', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      stubHttpService.setPostResult(
        of({
          data: { translatedText: 'Olá mundo' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Olá mundo');
    });
  });

  describe('Supported Languages (PT-BR and EN only)', () => {
    it('should support pt as source language', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      stubHttpService.setPostResult(
        of({
          data: { translatedText: 'Translated' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        }),
      );

      await service.translate('Text', 'pt', 'en');

      const postCalls = stubHttpService.getCallsFor('post');
      expect(postCalls.length).toBeGreaterThan(0);
      const lastCall = postCalls[postCalls.length - 1];
      expect(lastCall.args[1]).toMatchObject({
        source: 'pt',
        target: 'en',
      });
    });

    it('should support en as source language', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      stubHttpService.setPostResult(
        of({
          data: { translatedText: 'Traduzido' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        }),
      );

      await service.translate('Text', 'en', 'pt');

      const postCalls = stubHttpService.getCallsFor('post');
      expect(postCalls.length).toBeGreaterThan(0);
      const lastCall = postCalls[postCalls.length - 1];
      expect(lastCall.args[1]).toMatchObject({
        source: 'en',
        target: 'pt',
      });
    });
  });

  describe('Empty/Null Text Handling', () => {
    it('should return empty string for empty input', async () => {
      const result = await service.translate('', 'en', 'pt');

      expect(result.original).toBe('');
      expect(result.translated).toBe('');
      // Should not call API for empty text
      expect(stubHttpService.getCallsFor('post').length).toBe(0);
    });

    it('should return whitespace string as-is', async () => {
      const result = await service.translate('   ', 'en', 'pt');

      expect(result.original).toBe('   ');
      expect(result.translated).toBe('   ');
      expect(stubHttpService.getCallsFor('post').length).toBe(0);
    });
  });

  describe('Service Availability', () => {
    it('should check service health on init', async () => {
      stubHttpService.setGetResult(
        of({
          data: { status: 'ok' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        }),
      );

      const healthResult = await service.checkServiceHealth();

      expect(healthResult).toBe(true);
    });

    it('should mark service unavailable on health check failure', async () => {
      stubHttpService.setGetError(new Error('Connection failed'));

      const healthResult = await service.checkServiceHealth();

      expect(healthResult).toBe(false);
      expect(service.isAvailable()).toBe(false);
    });

    it('should report availability status', () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      expect(service.isAvailable()).toBe(true);

      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = false;
      expect(service.isAvailable()).toBe(false);
    });
  });
});
