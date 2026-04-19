import { Inject, Injectable } from '@nestjs/common';
import {
  LLM_PORT,
  type LlmPort,
  type TailorResumeInput,
  type TailorResumeOutput,
} from '../../../domain/ports/llm.port';

/**
 * Application use-case: tailor a resume to a job description via the LLM port.
 * Keeps the application layer in control of the prompt contract so callers
 * (e.g. the resume-versions tailor service) depend on a domain use-case rather
 * than directly on the LLM adapter.
 */
@Injectable()
export class TailorResumeUseCase {
  constructor(@Inject(LLM_PORT) private readonly llm: LlmPort) {}

  async execute(input: TailorResumeInput): Promise<TailorResumeOutput> {
    return this.llm.tailorResume(input);
  }
}
