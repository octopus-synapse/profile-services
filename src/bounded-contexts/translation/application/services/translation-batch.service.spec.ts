import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type {
  TranslateBatchResult,
  TranslationLlmPort,
} from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import { TranslationBatchService } from './translation-batch.service';

function buildFakePort(
  batch: (texts: ReadonlyArray<string>) => Promise<TranslateBatchResult>,
): TranslationLlmPort {
  return {
    translate: mock(async () => ({
      original: '',
      translated: '',
      source: 'en',
      target: 'pt',
      detectedLanguage: null,
      tokensUsed: 0,
      cacheHit: false,
    })),
    translateBatch: mock(batch),
    translateObject: mock(async () => ({}) as never),
    detectLanguage: mock(async () => ({
      language: null,
      confidence: 0,
      tokensUsed: 0,
      cacheHit: false,
    })),
    isAvailable: () => true,
  } as unknown as TranslationLlmPort;
}

describe('TranslationBatchService', () => {
  let service: TranslationBatchService;

  beforeEach(() => {
    const port = buildFakePort(async (texts) => ({
      translations: texts.map((text) => ({
        original: text,
        translated: `translated_${text}`,
        source: 'en',
        target: 'pt',
        detectedLanguage: null,
        tokensUsed: 0,
        cacheHit: false,
      })),
      failed: [],
      tokensUsed: texts.length * 10,
    }));
    service = new TranslationBatchService(port);
  });

  it('delegates to the port and shapes the BC DTO', async () => {
    const result = await service.translateBatch(['hello', 'world'], 'en', 'pt');
    expect(result.translations).toHaveLength(2);
    expect(result.translations[0]).toMatchObject({
      original: 'hello',
      translated: 'translated_hello',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
    });
    expect(result.failed).toHaveLength(0);
  });

  it('returns empty result for empty input without hitting the port', async () => {
    const port = buildFakePort(async () => ({
      translations: [],
      failed: [],
      tokensUsed: 0,
    }));
    const svc = new TranslationBatchService(port);
    const result = await svc.translateBatch([], 'en', 'pt');
    expect(result.translations).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
    expect(
      (port.translateBatch as unknown as { mock: { calls: unknown[] } }).mock.calls,
    ).toHaveLength(0);
  });

  it('propagates partial failures from the port', async () => {
    const port = buildFakePort(async (texts) => ({
      translations: texts.map((text) => ({
        original: text,
        translated: text === 'fail' ? text : `ok_${text}`,
        source: 'en',
        target: 'pt',
        detectedLanguage: null,
        tokensUsed: 0,
        cacheHit: false,
      })),
      failed: [{ text: 'fail', error: 'rate-limited' }],
      tokensUsed: 30,
    }));
    const svc = new TranslationBatchService(port);
    const result = await svc.translateBatch(['good', 'fail', 'also_good'], 'en', 'pt');
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toMatchObject({ text: 'fail', error: 'rate-limited' });
  });
});
