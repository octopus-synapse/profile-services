/**
 * Adapter that satisfies automation's `ResumeTailorPort` by delegating
 * to the live `ResumeTailorService` from the resumes BC. Wired in
 * `automation.composition.ts`.
 *
 * Existing on its own (rather than as a `new ResumeTailorService()`
 * call inside the composition) keeps the typed port→adapter
 * boundary symmetric with the rest of the BC's adapters and gives
 * unit tests a clean stub target.
 */

import type { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import {
  ResumeTailorPort,
  type TailorJobInput,
  type TailorResumeResult,
} from '../../../application/ports/resume-tailor.port';

export class ResumeTailorAdapter extends ResumeTailorPort {
  constructor(private readonly service: ResumeTailorService) {
    super();
  }

  async tailorForJob(input: TailorJobInput): Promise<TailorResumeResult> {
    return this.service.tailorForJob(input);
  }
}
