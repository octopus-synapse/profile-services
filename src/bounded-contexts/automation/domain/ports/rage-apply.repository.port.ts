/**
 * Outbound port for the rage-apply persistence concerns.
 *
 * The use case uses three reads/writes:
 *  - look up a user snapshot (active + primary resume + apply criteria),
 *  - check whether the user has already applied to a given job,
 *  - create a `JobApplication` row pointing at the tailored version.
 *
 * Adapters MUST treat the unique `(jobId, userId)` constraint as the
 * authoritative dedupe — `findExistingApplication` is the cheap
 * pre-check, `createApplication` is the source of truth.
 */

import type { RageApplyUserSnapshot } from '../entities/rage-apply';

export interface CreateApplicationInput {
  readonly jobId: string;
  readonly userId: string;
  readonly resumeId: string;
  readonly tailoredVersionId: string;
  readonly coverLetter: string | null;
}

export abstract class RageApplyRepositoryPort {
  abstract findUserSnapshot(userId: string): Promise<RageApplyUserSnapshot | null>;
  abstract findExistingApplication(jobId: string, userId: string): Promise<boolean>;
  abstract createApplication(input: CreateApplicationInput): Promise<void>;
}
