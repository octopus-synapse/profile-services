import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EMBEDDINGS_PORT, EmbeddingsPort } from './domain/ports/embeddings.port';
import { LLM_PORT, LlmPort } from './domain/ports/llm.port';
import { SCORING_LLM_PORT, ScoringLlmPort } from './domain/ports/scoring-llm.port';
import { OpenAIAdapter } from './infrastructure/adapters/openai.adapter';
import { OpenAIEmbeddingsAdapter } from './infrastructure/adapters/openai-embeddings.adapter';
import { OpenAIScoringAdapter } from './infrastructure/adapters/openai-scoring.adapter';

/**
 * ai/ context — provider-agnostic LLM + embeddings surface consumed by
 * resume/job transformations and the scoring subsystem. Binds the
 * abstract-class ports AND symbol tokens so consumers can inject either
 * way. Swapping providers is a one-line `useExisting` change per port.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    OpenAIAdapter,
    OpenAIScoringAdapter,
    OpenAIEmbeddingsAdapter,
    // LLM — transforms
    { provide: LlmPort, useExisting: OpenAIAdapter },
    { provide: LLM_PORT, useExisting: OpenAIAdapter },
    // LLM — scoring
    { provide: ScoringLlmPort, useExisting: OpenAIScoringAdapter },
    { provide: SCORING_LLM_PORT, useExisting: OpenAIScoringAdapter },
    // Embeddings
    { provide: EmbeddingsPort, useExisting: OpenAIEmbeddingsAdapter },
    { provide: EMBEDDINGS_PORT, useExisting: OpenAIEmbeddingsAdapter },
  ],
  exports: [LlmPort, LLM_PORT, ScoringLlmPort, SCORING_LLM_PORT, EmbeddingsPort, EMBEDDINGS_PORT],
})
export class AiModule {}
