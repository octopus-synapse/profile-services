import { Injectable } from '@nestjs/common';
import {
  SemanticMatcherPort,
  type SemanticMatchInput,
  type SemanticMatchResult,
} from '../../domain/ports/semantic-matcher.port';

/**
 * Placeholder Semantic Matcher — returns a flat 70. Task #19 wires
 * OpenAI `text-embedding-3-small` through the ai/ context with the
 * Redis embedding cache documented in docs/scoring/AI_PROMPTS.md.
 *
 * Gate this behind `scoring.match.semantic.enabled` when the real
 * adapter lands.
 */
@Injectable()
export class SemanticMatcherStubAdapter extends SemanticMatcherPort {
  async match(_input: SemanticMatchInput): Promise<SemanticMatchResult> {
    return { score: 70 };
  }
}
