import { Inject, Injectable } from '@nestjs/common';
import { type ExtractedResume, LLM_PORT, type LlmPort } from '../../../domain/ports/llm.port';

/**
 * Application use-case: turn raw CV text (e.g. extracted from a PDF) into a
 * structured resume via the LLM port.
 */
@Injectable()
export class ExtractResumeUseCase {
  constructor(@Inject(LLM_PORT) private readonly llm: LlmPort) {}

  async execute(text: string): Promise<ExtractedResume> {
    return this.llm.extractResumeFromText(text);
  }
}
