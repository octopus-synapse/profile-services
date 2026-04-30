/**
 * Embeddings Port — dedicated abstraction for vector embeddings.
 *
 * Kept separate from `LlmPort` because the two workloads have very
 * different cost profiles (embeddings are ~1000x cheaper per token)
 * and a single provider may want to service them differently.
 *
 * The MVP implementation targets OpenAI `text-embedding-3-small`
 * (1536 dims) per the plan. Swap providers by pointing the binding to
 * a different adapter; nothing upstream changes.
 */

export interface EmbeddingsResult {
  /** 1536-dim vector for OpenAI small; providers may differ. */ readonly vector: readonly number[];
  /** Provider-reported token count for cost logging. */
  readonly tokensUsed: number;
}

export abstract class EmbeddingsPort {
  abstract embed(text: string): Promise<EmbeddingsResult>;
  /** Batched variant — the provider charges the same per token but a
   * single HTTP call saves overhead when ranking many items at once. */
  abstract embedMany(texts: readonly string[]): Promise<readonly EmbeddingsResult[]>;
}
