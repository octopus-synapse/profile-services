/**
 * Port for the resume-tailoring slice automation needs.
 *
 * P1-046 — `RunRageApplyUseCase` previously imported
 * `ResumeTailorService` directly from the resumes BC, breaking the
 * cross-BC isolation rule (composition root is the only place
 * cross-BC wiring should happen). The use case now depends on this
 * minimal port and the composition wires the concrete service via a
 * thin adapter (`automation.composition.ts`).
 *
 * Keeping the port to ONE method (`tailorForJob`) — that's the only
 * surface the rage-apply flow consumes; the other tailoring methods
 * live elsewhere and don't belong in automation's view.
 */

import type {
  TailorJobInput,
  TailorResumeResult,
} from '@/bounded-contexts/resumes/resume-versions/domain/entities/tailor';

export type { TailorJobInput, TailorResumeResult };

export abstract class ResumeTailorPort {
  abstract tailorForJob(input: TailorJobInput): Promise<TailorResumeResult>;
}
