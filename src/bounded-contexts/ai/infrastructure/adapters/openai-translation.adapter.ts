import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import { LoggerPort } from '@/shared-kernel';
import { CACHE_PRESETS, CachePort } from '@/shared-kernel/cache';
import { ConfigPort } from '@/shared-kernel/config';
import {
  AiEmptyInputException,
  AiEmptyResponseException,
  AiInvalidOutputException,
  AiNotConfiguredException,
} from '../../domain/exceptions/ai.exceptions';
import {
  type DetectLanguageResult,
  type JsonValue,
  type SourceLanguage,
  type TranslateBatchResult,
  type TranslateObjectResult,
  type TranslateTextInput,
  type TranslateTextResult,
  type TranslationLanguage,
  TranslationLlmPort,
} from '../../domain/ports/translation-llm.port';
import {
  buildDetectLanguageUserMessage,
  buildTranslateBatchUserMessage,
  buildTranslateObjectUserMessage,
  buildTranslateTextUserMessage,
  TRANSLATE_PROMPT_SEMVER,
  TRANSLATE_PROMPT_SHA,
  TRANSLATE_SYSTEM_PROMPT,
} from '../../domain/prompts/translate.v1';

const CTX = 'OpenAITranslationAdapter';
const PROMPT_VERSION_TAG = `${TRANSLATE_PROMPT_SEMVER}#${TRANSLATE_PROMPT_SHA}`;
/** Hard chunk-size cap inside `translateBatch`. The LLM gets one call
 * per chunk so partial failures stay scoped; >30 items risks the model
 * truncating the array under max_tokens pressure. */
const BATCH_CHUNK_SIZE = 25;

const TranslateTextOutputSchema = z.object({
  translated: z.string(),
  detectedLanguage: z.enum(['pt', 'en']).nullable().default(null),
});

const TranslateBatchOutputSchema = z.object({
  translations: z.array(z.string()),
});

const TranslateObjectOutputSchema = z.object({
  translated: z.unknown(),
});

const DetectLanguageOutputSchema = z.object({
  language: z.enum(['pt', 'en']).nullable().default(null),
  confidence: z.number().min(0).max(1).default(0),
});

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * OpenAI adapter for translation. Replaces the LibreTranslate HTTP
 * service; reuses the same patterns as `OpenAIAdapter` /
 * `OpenAIScoringAdapter` — JSON mode, Zod validation with one retry on
 * schema-miss, 60s timeout, PII-safe logging (never logs response
 * content; only length + tokensUsed).
 *
 * Cache: Redis (`CachePort`) keyed by sha256(input || promptVersion).
 * TTL = `CACHE_PRESETS.TRANSLATION` (30 days). Translations are
 * deterministic at `temperature: 0`, so aggressive caching is safe and
 * the prompt SHA in the key invalidates everything when the prompt
 * evolves.
 */
export class OpenAITranslationAdapter extends TranslationLlmPort {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(
    private readonly config: ConfigPort,
    private readonly logger: LoggerPort,
    private readonly cache: CachePort,
  ) {
    super();
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.client = new OpenAI({ apiKey: apiKey ?? 'unset', timeout: 60_000, maxRetries: 0 });
    this.model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    this.maxTokens = Number(this.config.get<string>('OPENAI_TRANSLATION_MAX_TOKENS') ?? '4000');
  }

  isAvailable(): boolean {
    return !!this.config.get<string>('OPENAI_API_KEY');
  }

  async translate(input: TranslateTextInput): Promise<TranslateTextResult> {
    this.assertConfigured();
    if (!input.text.trim()) {
      return {
        original: input.text,
        translated: input.text,
        source: input.source,
        target: input.target,
        detectedLanguage: null,
        tokensUsed: 0,
        cacheHit: false,
      };
    }

    const cacheKey = this.cacheKey('text', input.source, input.target, input.text);
    const cached = await this.cacheGet<{
      translated: string;
      detectedLanguage: TranslationLanguage | null;
    }>(cacheKey);
    if (cached) {
      this.logTokens('translate', 0, cached.translated.length, true);
      return {
        original: input.text,
        translated: cached.translated,
        source: input.source,
        target: input.target,
        detectedLanguage: cached.detectedLanguage,
        tokensUsed: 0,
        cacheHit: true,
      };
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
      { role: 'user', content: buildTranslateTextUserMessage(input) },
    ];
    const { data, tokensUsed } = await this.callWithRetry(
      'translate',
      messages,
      TranslateTextOutputSchema,
    );
    await this.cacheSet(cacheKey, {
      translated: data.translated,
      detectedLanguage: data.detectedLanguage,
    });
    this.logTokens('translate', tokensUsed, data.translated.length, false);
    return {
      original: input.text,
      translated: data.translated,
      source: input.source,
      target: input.target,
      detectedLanguage: data.detectedLanguage,
      tokensUsed,
      cacheHit: false,
    };
  }

  async translateBatch(
    texts: ReadonlyArray<string>,
    source: SourceLanguage,
    target: TranslationLanguage,
  ): Promise<TranslateBatchResult> {
    this.assertConfigured();
    if (texts.length === 0) {
      return { translations: [], failed: [], tokensUsed: 0 };
    }

    const allTranslations: TranslateTextResult[] = [];
    const failed: Array<{ text: string; error: string }> = [];
    let totalTokens = 0;

    for (let i = 0; i < texts.length; i += BATCH_CHUNK_SIZE) {
      const chunk = texts.slice(i, i + BATCH_CHUNK_SIZE);
      try {
        const chunkResults = await this.translateBatchChunk(chunk, source, target);
        allTranslations.push(...chunkResults.translations);
        totalTokens += chunkResults.tokensUsed;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        for (const text of chunk) {
          failed.push({ text, error: message });
          allTranslations.push({
            original: text,
            translated: text,
            source,
            target,
            detectedLanguage: null,
            tokensUsed: 0,
            cacheHit: false,
          });
        }
        this.logger.warn(`translateBatch chunk failed: ${message}`, CTX);
      }
    }

    return { translations: allTranslations, failed, tokensUsed: totalTokens };
  }

  private async translateBatchChunk(
    texts: ReadonlyArray<string>,
    source: SourceLanguage,
    target: TranslationLanguage,
  ): Promise<{ translations: TranslateTextResult[]; tokensUsed: number }> {
    // Partition into cache hits vs misses to minimise token spend.
    const hits = new Map<number, string>();
    const missIndexes: number[] = [];
    const missTexts: string[] = [];

    await Promise.all(
      texts.map(async (text, idx) => {
        if (!text.trim()) {
          hits.set(idx, text);
          return;
        }
        const key = this.cacheKey('text', source, target, text);
        const cached = await this.cacheGet<{ translated: string }>(key);
        if (cached) {
          hits.set(idx, cached.translated);
        } else {
          missIndexes.push(idx);
          missTexts.push(text);
        }
      }),
    );

    let tokensUsed = 0;
    const missResults = new Map<number, string>();
    if (missTexts.length > 0) {
      const messages: ChatMessage[] = [
        { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildTranslateBatchUserMessage({ texts: missTexts, source, target }),
        },
      ];
      const { data, tokensUsed: spent } = await this.callWithRetry(
        'translateBatch',
        messages,
        TranslateBatchOutputSchema,
      );
      tokensUsed = spent;
      if (data.translations.length !== missTexts.length) {
        throw new AiInvalidOutputException(
          `translateBatch: expected ${missTexts.length} items, got ${data.translations.length}`,
        );
      }
      await Promise.all(
        data.translations.map(async (translated, i) => {
          const originalIdx = missIndexes[i];
          missResults.set(originalIdx, translated);
          const key = this.cacheKey('text', source, target, missTexts[i]);
          await this.cacheSet(key, { translated, detectedLanguage: null });
        }),
      );
    }

    const translations: TranslateTextResult[] = texts.map((text, idx) => {
      const fromCache = hits.has(idx);
      const translated = fromCache ? (hits.get(idx) ?? text) : (missResults.get(idx) ?? text);
      return {
        original: text,
        translated,
        source,
        target,
        detectedLanguage: null,
        tokensUsed: 0,
        cacheHit: fromCache,
      };
    });
    return { translations, tokensUsed };
  }

  async translateObject<T extends JsonValue>(
    obj: T,
    source: SourceLanguage,
    target: TranslationLanguage,
  ): Promise<TranslateObjectResult<T>> {
    this.assertConfigured();

    const serialized = JSON.stringify(obj);
    const cacheKey = this.cacheKey('object', source, target, serialized);
    const cached = await this.cacheGet<{ translated: T }>(cacheKey);
    if (cached) {
      this.logTokens('translateObject', 0, serialized.length, true);
      return {
        translated: cached.translated,
        source,
        target,
        tokensUsed: 0,
        cacheHit: true,
      };
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
      { role: 'user', content: buildTranslateObjectUserMessage({ object: obj, source, target }) },
    ];
    const { data, tokensUsed } = await this.callWithRetry(
      'translateObject',
      messages,
      TranslateObjectOutputSchema,
    );
    const translated = data.translated as T;
    await this.cacheSet(cacheKey, { translated });
    this.logTokens('translateObject', tokensUsed, serialized.length, false);
    return { translated, source, target, tokensUsed, cacheHit: false };
  }

  async detectLanguage(text: string): Promise<DetectLanguageResult> {
    this.assertConfigured();
    if (!text.trim()) {
      throw new AiEmptyInputException('detectLanguage');
    }

    const cacheKey = this.cacheKey('detect', 'auto', 'pt', text);
    const cached = await this.cacheGet<{
      language: TranslationLanguage | null;
      confidence: number;
    }>(cacheKey);
    if (cached) {
      return { ...cached, tokensUsed: 0, cacheHit: true };
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
      { role: 'user', content: buildDetectLanguageUserMessage({ text }) },
    ];
    const { data, tokensUsed } = await this.callWithRetry(
      'detectLanguage',
      messages,
      DetectLanguageOutputSchema,
    );
    await this.cacheSet(cacheKey, { language: data.language, confidence: data.confidence });
    return {
      language: data.language,
      confidence: data.confidence,
      tokensUsed,
      cacheHit: false,
    };
  }

  /**
   * Mirrors `OpenAIScoringAdapter.callWithRetry` — one-shot retry on
   * schema-miss with the validator's complaint fed back into a follow-up
   * system message. The first attempt may also fail JSON parsing; that
   * path also retries with the failure surfaced to the model.
   */
  private async callWithRetry<T>(
    operation: string,
    baseMessages: ReadonlyArray<ChatMessage>,
    schema: {
      safeParse: (
        v: unknown,
      ) => { success: true; data: T } | { success: false; error: { message: string } };
    },
  ): Promise<{ data: T; tokensUsed: number }> {
    let lastError = '';
    let totalTokens = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const messages: ChatMessage[] =
        attempt === 0
          ? [...baseMessages]
          : [
              ...baseMessages,
              {
                role: 'system',
                content: `Your previous response failed validation: ${lastError}. Return strictly valid JSON matching the schema, with no extra prose.`,
              },
            ];
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages,
      });
      totalTokens += response.usage?.total_tokens ?? 0;
      const raw = response.choices[0]?.message?.content;
      if (!raw) {
        if (attempt === 1) throw new AiEmptyResponseException(operation);
        lastError = 'response was empty';
        continue;
      }
      const parsed = this.parseJson(raw, operation);
      const result = schema.safeParse(parsed);
      if (result.success) return { data: result.data, tokensUsed: totalTokens };
      lastError = result.error.message.slice(0, 500);
      this.logger.warn(
        `${operation} schema validation failed (attempt ${attempt + 1}/2): ${lastError}`,
        CTX,
      );
    }
    throw new AiInvalidOutputException(operation);
  }

  private parseJson(raw: string, operation: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      this.logger.warn(`OpenAI ${operation} returned non-JSON payload`, CTX);
      return {};
    }
  }

  private cacheKey(
    op: 'text' | 'object' | 'detect',
    source: SourceLanguage,
    target: TranslationLanguage,
    payload: string,
  ): string {
    const sha = createHash('sha256').update(payload).digest('hex').slice(0, 24);
    return `translation:openai:${PROMPT_VERSION_TAG}:${op}:${source}:${target}:${sha}`;
  }

  private async cacheGet<T>(key: string): Promise<T | null> {
    try {
      return await this.cache.get<T>(key);
    } catch (err) {
      this.logger.warn(
        `cache GET failed (degrading to live call): ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
      return null;
    }
  }

  private async cacheSet<T>(key: string, value: T): Promise<void> {
    try {
      await this.cache.set(key, value, CACHE_PRESETS.TRANSLATION);
    } catch (err) {
      this.logger.warn(
        `cache SET failed (translation will be re-fetched next time): ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
    }
  }

  /** P0-#12: never log the translated payload — it can echo back the
   * user's resume content (PII). Only length + tokens. */
  private logTokens(
    operation: string,
    tokensUsed: number,
    outputLength: number,
    cacheHit: boolean,
  ) {
    this.logger.log(
      `${operation} ${cacheHit ? 'cache-hit' : 'live'} tokens=${tokensUsed} outLen=${outputLength}`,
      CTX,
    );
  }

  private assertConfigured(): void {
    if (!this.config.get<string>('OPENAI_API_KEY')) {
      throw new AiNotConfiguredException();
    }
  }
}
