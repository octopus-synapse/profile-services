import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type {
  DetectLanguageResult,
  TranslateTextInput,
  TranslateTextResult,
  TranslationLlmPort,
} from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { TranslationBackendUnavailableException } from '../../domain/exceptions/translation.exceptions';
import { TranslationCoreService } from './translation-core.service';

function buildFakePort(overrides?: {
  translate?: (input: TranslateTextInput) => Promise<TranslateTextResult>;
  detectLanguage?: (text: string) => Promise<DetectLanguageResult>;
  isAvailable?: () => boolean;
}): TranslationLlmPort {
  return {
    translate: mock(
      overrides?.translate ??
        (async (input: TranslateTextInput) => ({
          original: input.text,
          translated: `[${input.target}] ${input.text}`,
          source: input.source,
          target: input.target,
          detectedLanguage: null,
          tokensUsed: 10,
          cacheHit: false,
        })),
    ),
    translateBatch: mock(async () => ({ translations: [], failed: [], tokensUsed: 0 })),
    translateObject: mock(async (obj) => ({
      translated: obj,
      source: 'pt',
      target: 'en',
      tokensUsed: 0,
      cacheHit: false,
    })),
    detectLanguage: mock(
      overrides?.detectLanguage ??
        (async () => ({ language: 'en', confidence: 0.95, tokensUsed: 5, cacheHit: false })),
    ),
    isAvailable: overrides?.isAvailable ?? (() => true),
  } as unknown as TranslationLlmPort;
}

describe('TranslationCoreService', () => {
  let service: TranslationCoreService;
  let port: TranslationLlmPort;

  beforeEach(() => {
    port = buildFakePort();
    service = new TranslationCoreService(port, stubLogger);
  });

  describe('Empty / whitespace input', () => {
    it('returns original for empty string without hitting the port', async () => {
      const result = await service.translate('', 'en', 'pt');
      expect(result.translated).toBe('');
      expect((port.translate as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(
        0,
      );
    });

    it('returns whitespace as-is', async () => {
      const result = await service.translate('   ', 'en', 'pt');
      expect(result.translated).toBe('   ');
    });
  });

  describe('Successful translation', () => {
    it('translates PT → EN through the port', async () => {
      const result = await service.translate('Olá mundo', 'pt', 'en');
      expect(result.original).toBe('Olá mundo');
      expect(result.translated).toBe('[en] Olá mundo');
      expect(result.sourceLanguage).toBe('pt');
      expect(result.targetLanguage).toBe('en');
    });

    it('passes language parameters to the port', async () => {
      await service.translate('Text', 'pt', 'en');
      const calls = (port.translate as unknown as { mock: { calls: TranslateTextInput[][] } }).mock
        .calls;
      expect(calls[0][0]).toMatchObject({ text: 'Text', source: 'pt', target: 'en' });
    });

    it('exposes detectedLanguage when port returns one', async () => {
      port = buildFakePort({
        translate: async (input) => ({
          original: input.text,
          translated: 'Hello',
          source: input.source,
          target: input.target,
          detectedLanguage: 'pt',
          tokensUsed: 12,
          cacheHit: false,
        }),
      });
      service = new TranslationCoreService(port, stubLogger);
      const result = await service.translate('Olá', 'auto', 'en');
      expect(result.detectedLanguage).toBe('pt');
    });
  });

  describe('Failure handling', () => {
    it('maps port errors to TranslationBackendUnavailableException', async () => {
      port = buildFakePort({
        translate: async () => {
          throw new Error('OpenAI rate-limited');
        },
      });
      service = new TranslationCoreService(port, stubLogger);
      await expect(service.translate('Hello', 'en', 'pt')).rejects.toBeInstanceOf(
        TranslationBackendUnavailableException,
      );
    });
  });

  describe('Language detection', () => {
    it('shapes single detection into the BC DTO', async () => {
      const detections = await service.detectLanguage('Olá mundo');
      expect(detections).toHaveLength(1);
      expect(detections[0]).toMatchObject({ language: 'en', confidence: 0.95 });
    });

    it('returns empty array for empty text without hitting the port', async () => {
      const detections = await service.detectLanguage('');
      expect(detections).toEqual([]);
      expect(
        (port.detectLanguage as unknown as { mock: { calls: unknown[] } }).mock.calls,
      ).toHaveLength(0);
    });

    it('returns empty array when port has no detection', async () => {
      port = buildFakePort({
        detectLanguage: async () => ({
          language: null,
          confidence: 0,
          tokensUsed: 5,
          cacheHit: false,
        }),
      });
      service = new TranslationCoreService(port, stubLogger);
      expect(await service.detectLanguage('xyz')).toEqual([]);
    });
  });

  describe('Health / availability', () => {
    it('reports healthy when provider is configured', async () => {
      expect(await service.checkServiceHealth()).toBe(true);
      expect(service.isAvailable()).toBe(true);
    });

    it('reports unavailable when provider is unconfigured', async () => {
      port = buildFakePort({ isAvailable: () => false });
      service = new TranslationCoreService(port, stubLogger);
      expect(await service.checkServiceHealth()).toBe(false);
      expect(service.isAvailable()).toBe(false);
    });
  });
});
