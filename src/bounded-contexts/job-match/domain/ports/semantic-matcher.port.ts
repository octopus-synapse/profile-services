import type { SubScoreResult } from '../types';

export interface SemanticMatchInput {
  readonly resumeId: string;
  readonly jobId: string;
}

export interface SemanticMatchResult extends SubScoreResult {
  readonly score: number | null;
}

/**
 * Port for the Semantic Match sub-score — embeddings similarity
 * between the CV body and the JD body. Real adapter lives in the
 * `ai/` context (Task #19) and wraps OpenAI `text-embedding-3-small`
 * with the Redis embedding cache. Until then the stub returns a
 * conservative placeholder.
 *
 * Kill-switch lives behind the `scoring.match.semantic.enabled` feature
 * flag so ops can disable the AI path wholesale during incidents.
 */
export abstract class SemanticMatcherPort {
  abstract match(input: SemanticMatchInput): Promise<SemanticMatchResult>;
}
