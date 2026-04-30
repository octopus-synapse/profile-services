import { type ExtractedResume, LlmPort } from '../../../domain/ports/llm.port';

/**
 * Application use-case: turn raw CV text (e.g. extracted from a PDF) into a
 * structured resume via the LLM port.
 */
export class ExtractResumeUseCase {
  constructor(private readonly llm: LlmPort) {}

  async execute(text: string): Promise<ExtractedResume> {
    return this.llm.extractResumeFromText(text);
  }
}
