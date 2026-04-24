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
 * between the CV body and the JD body. The implementation —
 * `AiSemanticMatcherAdapter` — wraps OpenAI `text-embedding-3-small`
 * via `EmbeddingsPort` with a 7-day Redis embedding cache keyed on a
 * content hash so edits invalidate naturally.
 *
 * Kill-switch lives behind the `scoring.match.semantic.enabled` feature
 * flag so ops can disable the AI path wholesale during incidents.
 */
export abstract class SemanticMatcherPort {
  abstract match(input: SemanticMatchInput): Promise<SemanticMatchResult>;
}
