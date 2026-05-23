/**
 * Translation-specific LLM operations.
 *
 * Kept distinct from `LlmPort` (tailor/extract) and `ScoringLlmPort`
 * (content quality / requirements) so the translation prompt version
 * and adapter-level cache can evolve without touching the other AI
 * surfaces. All three ports are satisfied by separate OpenAI adapters
 * today.
 */

export type TranslationLanguage = 'pt' | 'en';
export type SourceLanguage = TranslationLanguage | 'auto';

/** Recursive JSON value the `translateObject` API accepts. The adapter
 * preserves structure (keys, array order, primitive types) and only
 * rewrites string leaves. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export interface TranslateTextInput {
  readonly text: string;
  readonly source: SourceLanguage;
  readonly target: TranslationLanguage;
}

export interface TranslateTextResult {
  readonly original: string;
  readonly translated: string;
  readonly source: SourceLanguage;
  readonly target: TranslationLanguage;
  /** Populated when `source === 'auto'`; null otherwise or when ambiguous. */
  readonly detectedLanguage: TranslationLanguage | null;
  readonly tokensUsed: number;
  readonly cacheHit: boolean;
}

export interface TranslateBatchResult {
  /** One entry per input text, in the same order. Failures appear as
   * entries with `translated === original` and the failure recorded in
   * `failed`. */
  readonly translations: ReadonlyArray<TranslateTextResult>;
  readonly failed: ReadonlyArray<{ readonly text: string; readonly error: string }>;
  readonly tokensUsed: number;
}

export interface TranslateObjectResult<T extends JsonValue> {
  readonly translated: T;
  readonly source: SourceLanguage;
  readonly target: TranslationLanguage;
  readonly tokensUsed: number;
  readonly cacheHit: boolean;
}

export interface DetectLanguageResult {
  /** `null` when text is ambiguous, empty, or not pt/en. */
  readonly language: TranslationLanguage | null;
  readonly confidence: number;
  readonly tokensUsed: number;
  readonly cacheHit: boolean;
}

export abstract class TranslationLlmPort {
  abstract translate(input: TranslateTextInput): Promise<TranslateTextResult>;
  abstract translateBatch(
    texts: ReadonlyArray<string>,
    source: SourceLanguage,
    target: TranslationLanguage,
  ): Promise<TranslateBatchResult>;
  abstract translateObject<T extends JsonValue>(
    obj: T,
    source: SourceLanguage,
    target: TranslationLanguage,
  ): Promise<TranslateObjectResult<T>>;
  abstract detectLanguage(text: string): Promise<DetectLanguageResult>;
  /** Synchronous availability check used by the BC translation health
   * endpoint. Returns true iff `OPENAI_API_KEY` is configured; does NOT
   * ping OpenAI (cheap, no token spend on every healthcheck). */
  abstract isAvailable(): boolean;
}
