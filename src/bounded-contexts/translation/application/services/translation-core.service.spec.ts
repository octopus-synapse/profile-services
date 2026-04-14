import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { TranslationCoreService } from './translation-core.service';

const stubConfigService = {
  get: (key: string, defaultValue?: string): string | undefined => {
    if (key === 'LIBRETRANSLATE_URL') return 'http://localhost:5000';
    return defaultValue;
  },
};

let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
let fetchResult: { ok: boolean; status: number; json: () => Promise<unknown> } = {
  ok: true,
  status: 200,
  json: async () => ({}),
};

const originalFetch = globalThis.fetch;

describe('TranslationCoreService', () => {
  let service: TranslationCoreService;

  beforeEach(() => {
    fetchCalls = [];
    fetchResult = { ok: true, status: 200, json: async () => ({}) };
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });
      return fetchResult as unknown as Response;
    }) as typeof fetch;
    service = new TranslationCoreService(stubConfigService as never);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Fallback Behavior', () => {
    it('should return original text when service is unavailable', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = false;
      const result = await service.translate('Hello world', 'en', 'pt');
      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world');
    });

    it('should return original text on HTTP error', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      globalThis.fetch = mock(async () => {
        throw new Error('Connection refused');
      }) as typeof fetch;
      const result = await service.translate('Hello world', 'en', 'pt');
      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world');
    });

    it('should return original text on timeout', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      globalThis.fetch = mock(async () => {
        throw new Error('Timeout');
      }) as typeof fetch;
      const result = await service.translate('Hello world', 'en', 'pt');
      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Hello world');
    });

    it('should continue main flow on translation failure', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      globalThis.fetch = mock(async () => {
        throw new Error('Service error');
      }) as typeof fetch;
      const result = await service.translate('Test text', 'pt', 'en');
      expect(result).toBeDefined();
      expect(result.translated).toBe('Test text');
    });
  });

  describe('Successful Translation', () => {
    it('should translate PT to EN', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchResult = {
        ok: true,
        status: 200,
        json: async () => ({ translatedText: 'Hello world' }),
      };
      const result = await service.translate('Olá mundo', 'pt', 'en');
      expect(result.original).toBe('Olá mundo');
      expect(result.translated).toBe('Hello world');
      expect(result.sourceLanguage).toBe('pt');
      expect(result.targetLanguage).toBe('en');
    });

    it('should translate EN to PT', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchResult = { ok: true, status: 200, json: async () => ({ translatedText: 'Olá mundo' }) };
      const result = await service.translate('Hello world', 'en', 'pt');
      expect(result.original).toBe('Hello world');
      expect(result.translated).toBe('Olá mundo');
    });
  });

  describe('Supported Languages (PT-BR and EN only)', () => {
    it('should send correct language params', async () => {
      (service as unknown as { isServiceAvailable: boolean }).isServiceAvailable = true;
      fetchResult = { ok: true, status: 200, json: async () => ({ translatedText: 'Translated' }) };
      await service.translate('Text', 'pt', 'en');
      const postCalls = fetchCalls.filter((c) => c.init?.method === 'POST');
      expect(postCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(postCalls[0].init?.body as string);
      expect(body.source).toBe('pt');
      expect(body.target).toBe('en');
    });
  });

  describe('Empty/Null Text Handling', () => {
    it('should return empty string for empty input', async () => {
      const result = await service.translate('', 'en', 'pt');
      expect(result.original).toBe('');
      expect(result.translated).toBe('');
      const postCalls = fetchCalls.filter((c) => c.init?.method === 'POST');
      expect(postCalls.length).toBe(0);
    });

    it('should return whitespace string as-is', async () => {
      const result = await service.translate('   ', 'en', 'pt');
      expect(result.original).toBe('   ');
      expect(result.translated).toBe('   ');
    });
  });

  describe('Service Availability', () => {
    it('should check service health on init', async () => {
      fetchResult = { ok: true, status: 200, json: async () => ({}) };
      const healthResult = await service.checkServiceHealth();
      expect(healthResult).toBe(true);
    });

    it('should mark service unavailable on health check failure', async () => {
      globalThis.fetch = mock(async () => {
        throw new Error('Connection failed');
      }) as typeof fetch;
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
