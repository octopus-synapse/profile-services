/**
 * Pure-TS wiring for the ai BC. Zero `@nestjs/*` imports.
 *
 * `ai/` has no HTTP routes — it's a port-providing BC consumed by
 * `import`, `jobs`, `resume-quality`, etc. So instead of returning a
 * full `BoundedContextComposition<TBundle>` this builder just returns
 * the bundle of port impls (`llm`, `scoringLlm`, `embeddings`).
 *
 * The OpenAI text adapter implements `Lifecycle` (it lazy-builds its
 * client/model fields in `init()`); callers must `await` the returned
 * `init` to keep parity with the legacy module's
 * `OPENAI_ADAPTER_INIT` side-effect provider.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { ConfigPort } from '@/shared-kernel/config';
import type { EmbeddingsPort } from './domain/ports/embeddings.port';
import type { LlmPort } from './domain/ports/llm.port';
import type { ScoringLlmPort } from './domain/ports/scoring-llm.port';
import { OpenAIAdapter } from './infrastructure/adapters/openai.adapter';
import { OpenAIEmbeddingsAdapter } from './infrastructure/adapters/openai-embeddings.adapter';
import { OpenAIScoringAdapter } from './infrastructure/adapters/openai-scoring.adapter';

export interface AiBundle {
  readonly llm: LlmPort;
  readonly scoringLlm: ScoringLlmPort;
  readonly embeddings: EmbeddingsPort;
}

export interface AiComposition {
  readonly bundle: AiBundle;
  /** Mirrors the `OPENAI_ADAPTER_INIT` side-effect from the Nest module —
   * the text adapter only finishes constructing its client in `init()`.
   * Bootstrap (Nest factory + Elysia POC) must await this before serving. */
  readonly init: () => Promise<void>;
}

/**
 * Build the ai BC bundle. Sync construction returns the ports plus an
 * async `init` the caller must await. Keeps adapter lifecycle explicit
 * without requiring callers to thread `Lifecycle[]` through the bundle.
 */
export function buildAiComposition(config: ConfigPort, logger: LoggerPort): AiComposition {
  const llmAdapter = new OpenAIAdapter(config, logger);
  const scoringAdapter = new OpenAIScoringAdapter(config, logger);
  const embeddingsAdapter = new OpenAIEmbeddingsAdapter(config, logger);

  return {
    bundle: {
      llm: llmAdapter,
      scoringLlm: scoringAdapter,
      embeddings: embeddingsAdapter,
    },
    init: async () => {
      await llmAdapter.init();
    },
  };
}
