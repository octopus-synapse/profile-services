/**
 * Translation Core Service Tests
 *
 * Clean architecture: Stub fetch, Pure Bun tests
 *
 * Business Rules Tested:
 * 1. Fallback: Service failure returns original text with error flag
 * 2. Supported languages: Only PT-BR <-> EN
 * 3. Empty/null text handling
 * 4. Service availability check
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { TranslationCoreService } from './translation-core.service';

function mockFetchResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TranslationCoreService', () => {
  let service: TranslationCoreService;
  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockFetchResponse({}));
    const noopLogger = { log: () => {}, warn: () => {}, error: () => {} };
    service = new TranslationCoreService(noopLogger, 'http://localhost:5000');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('Fallback Behavior', () => {
    it('should return original text when service is unavailable', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = false;

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world');
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('pt');
    });

    it('should return original text on HTTP error', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchSpy.mockRejectedValue(new Error('Connection refused'));

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world');
    });

    it('should return original text on timeout', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchSpy.mockRejectedValue(new Error('Timeout'));

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world');
    });

    it('should continue main flow on translation failure', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchSpy.mockRejectedValue(new Error('Service error'));

      const result = await service.translate('Test text', 'pt', 'en');

      expect(result).toBeDefined();
      expect(result.translated).toBe('Test text');
    });
  });

  describe('Successful Translation', () => {
    it('should translate PT to EN', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchSpy.mockResolvedValue(mockFetchResponse({ translatedText: 'Hello world' }));

      const result = await service.translate('Olá mundo', 'pt', 'en');

      expect(result.original).toBe('Olá mundo');
      expect(result.translated).toBe('Hello world');
      expect(result.sourceLanguage).toBe('pt');
      expect(result.targetLanguage).toBe('en');
    });

    it('should translate EN to PT', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchSpy.mockResolvedValue(mockFetchResponse({ translatedText: 'Olá mundo' }));

      const result = await service.translate('Hello world', 'en', 'pt');

      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Olá mundo');
    });
  });

  describe('Supported Languages (PT-BR and EN only)', () => {
    it('should support pt as source language', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchSpy.mockResolvedValue(mockFetchResponse({ translatedText: 'Translated' }));

      await service.translate('Text', 'pt', 'en');

      expect(fetchSpy).toHaveBeenCalled();
      const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
      const body = JSON.parse(lastCall?.[1]?.body as string);
      expect(body.source).toBe('pt');
      expect(body.target).toBe('en');
    });

    it('should support en as source language', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchSpy.mockResolvedValue(mockFetchResponse({ translatedText: 'Traduzido' }));

      await service.translate('Text', 'en', 'pt');

      expect(fetchSpy).toHaveBeenCalled();
      const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
      const body = JSON.parse(lastCall?.[1]?.body as string);
      expect(body.source).toBe('en');
      expect(body.target).toBe('pt');
    });
  });

  describe('Empty/Null Text Handling', () => {
    it('should return empty string for empty input', async () => {
      const result = await service.translate('', 'en', 'pt');

      expect(result.original).toBe('');
      expect(result.translated).toBe('');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should return whitespace string as-is', async () => {
      const result = await service.translate('   ', 'en', 'pt');

      expect(result.original).toBe('   ');
      expect(result.translated).toBe('   ');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Service Availability', () => {
    it('should check service health on init', async () => {
      fetchSpy.mockResolvedValue(mockFetchResponse({ status: 'ok' }));

      const healthResult = await service.checkServiceHealth();

      expect(healthResult).toBe(true);
    });

    it('should mark service unavailable on health check failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Connection failed'));

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
