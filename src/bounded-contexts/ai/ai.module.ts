import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLM_PORT, LlmPort } from './domain/ports/llm.port';
import { OpenAIAdapter } from './infrastructure/adapters/openai.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    OpenAIAdapter,
    // Bind both the abstract class port (for constructor injection without
    // symbols) and the explicit symbol (for factories that prefer tokens).
    { provide: LlmPort, useExisting: OpenAIAdapter },
    { provide: LLM_PORT, useExisting: OpenAIAdapter },
  ],
  exports: [LlmPort, LLM_PORT],
})
export class AiModule {}
