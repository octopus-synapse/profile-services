import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type {
  JsonValue,
  TranslationLlmPort,
} from '@/bounded-contexts/ai/domain/ports/translation-llm.port';
import { ResumeTranslationService } from './resume-translation.service';

function buildFakePort(rewriter: (obj: JsonValue) => JsonValue = (o) => o): TranslationLlmPort {
  return {
    translate: mock(async () => ({}) as never),
    translateBatch: mock(async () => ({ translations: [], failed: [], tokensUsed: 0 })),
    translateObject: mock(async (obj: JsonValue, source, target) => ({
      translated: rewriter(obj),
      source,
      target,
      tokensUsed: 100,
      cacheHit: false,
    })),
    detectLanguage: mock(async () => ({
      language: null,
      confidence: 0,
      tokensUsed: 0,
      cacheHit: false,
    })),
    isAvailable: () => true,
  } as unknown as TranslationLlmPort;
}

describe('ResumeTranslationService', () => {
  let service: ResumeTranslationService;
  let port: TranslationLlmPort;

  beforeEach(() => {
    port = buildFakePort((obj) => {
      // Simulate the LLM: traverse and prepend `[EN]` to every string leaf.
      const visit = (v: JsonValue): JsonValue => {
        if (typeof v === 'string') return `[EN] ${v}`;
        if (Array.isArray(v)) return v.map(visit);
        if (v && typeof v === 'object') {
          const out: Record<string, JsonValue> = {};
          for (const [k, val] of Object.entries(v)) out[k] = visit(val as JsonValue);
          return out;
        }
        return v;
      };
      return visit(obj);
    });
    service = new ResumeTranslationService(port);
  });

  it('translates string fields via translateObject (single call)', async () => {
    const resume = { summary: 'Desenvolvedor experiente' };
    const result = await service.translateToEnglish(resume);
    expect(result.summary).toBe('[EN] Desenvolvedor experiente');
    expect(
      (port.translateObject as unknown as { mock: { calls: unknown[] } }).mock.calls,
    ).toHaveLength(1);
  });

  it('preserves array structure across the round-trip', async () => {
    const result = await service.translateToEnglish({ skills: ['JavaScript', 'TypeScript'] });
    expect(result.skills).toEqual(['[EN] JavaScript', '[EN] TypeScript']);
  });

  it('traverses nested objects', async () => {
    const result = await service.translateToEnglish({
      experience: { title: 'Senior Developer', description: 'Led team of 5' },
    });
    expect(result.experience).toEqual({
      title: '[EN] Senior Developer',
      description: '[EN] Led team of 5',
    });
  });

  it('uses pt as target in translateToPortuguese', async () => {
    await service.translateToPortuguese({ summary: 'Experienced developer' });
    const calls = (
      port.translateObject as unknown as { mock: { calls: [JsonValue, string, string][] } }
    ).mock.calls;
    expect(calls[0][1]).toBe('en');
    expect(calls[0][2]).toBe('pt');
  });
});
