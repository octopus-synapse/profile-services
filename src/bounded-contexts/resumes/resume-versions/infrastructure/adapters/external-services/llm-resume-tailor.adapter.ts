/**
 * Bridges this BC's `ResumeTailorLlmPort` to the global `LlmPort` exposed
 * by the `ai/` bounded context. Lives in infrastructure so the cross-BC
 * `LlmPort` import doesn't leak into application/domain layers — those
 * stay scoped to `ResumeTailorLlmPort`.
 */

import { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import {
  ResumeTailorLlmPort,
  type TailorLlmInput,
  type TailorLlmOutput,
} from '../../../domain/ports/resume-tailor-llm.port';

export class LlmResumeTailorAdapter extends ResumeTailorLlmPort {
  constructor(private readonly llm: LlmPort) {
    super();
  }

  async tailorResume(input: TailorLlmInput): Promise<TailorLlmOutput> {
    const out = await this.llm.tailorResume(input);
    return {
      summary: out.summary,
      jobTitle: out.jobTitle,
      bullets: out.bullets,
    };
  }
}
