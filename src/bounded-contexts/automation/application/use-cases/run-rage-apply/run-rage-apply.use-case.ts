/**
 * Rage Apply use case.
 *
 * Big-red-button orchestrator: pick every job above `minFit`, AI-tailor
 * a variant for each, submit a JobApplication. Bounded by
 * `maxApplications` so a slip of the finger doesn't send 500 CVs.
 * Reuses the same tailoring + application code paths as the scheduled
 * auto-apply worker so success metrics remain apples-to-apples.
 */

import { ResumeTailorService } from '@/bounded-contexts/resumes/resume-versions/application/services/resume-tailor.service';
import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CuratedSelectorService } from '../../services/curated-selector.service';
import type {
  RageApplyFailure,
  RageApplyInput,
  RageApplyResult,
} from '../../../domain/entities/rage-apply';
import { RageApplyRepositoryPort } from '../../../domain/ports/rage-apply.repository.port';

export type { RageApplyInput, RageApplyResult, RageApplyFailure };

const DEFAULT_MIN_FIT = 80;
const DEFAULT_MAX_APPLICATIONS = 20;
const DEFAULT_SINCE_DAYS = 7;
const MAX_APPLICATIONS_CAP = 100;

const CTX = 'RunRageApplyUseCase';

export class RunRageApplyUseCase {
  constructor(
    private readonly repository: RageApplyRepositoryPort,
    private readonly selector: CuratedSelectorService,
    private readonly tailor: ResumeTailorService,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: RageApplyInput): Promise<RageApplyResult> {
    const user = await this.repository.findUserSnapshot(input.userId);
    if (!user?.isActive) {
      throw new EntityNotFoundException('User', input.userId);
    }
    if (!user.primaryResumeId) {
      throw new EntityNotFoundException('Resume', 'primary');
    }
    const primaryResumeId = user.primaryResumeId;

    const minFit = input.minFit ?? user.applyCriteria?.minFit ?? DEFAULT_MIN_FIT;
    const maxApps = Math.min(
      input.maxApplications ?? DEFAULT_MAX_APPLICATIONS,
      MAX_APPLICATIONS_CAP,
    );
    const since =
      input.since ?? new Date(Date.now() - DEFAULT_SINCE_DAYS * 24 * 60 * 60 * 1000);

    const picks = await this.selector.selectForUser({
      userId: input.userId,
      since,
      minFit,
      limit: maxApps,
    });

    const failed: RageApplyFailure[] = [];
    let submitted = 0;
    let skippedExisting = 0;

    for (const pick of picks) {
      try {
        const alreadyApplied = await this.repository.findExistingApplication(
          pick.jobId,
          input.userId,
        );
        if (alreadyApplied) {
          skippedExisting += 1;
          continue;
        }

        const tailored = await this.tailor.tailorForJob({
          resumeId: primaryResumeId,
          userId: input.userId,
          jobId: pick.jobId,
        });

        await this.repository.createApplication({
          jobId: pick.jobId,
          userId: input.userId,
          resumeId: primaryResumeId,
          tailoredVersionId: tailored.versionId,
          coverLetter: tailored.summary ?? user.applyCriteria?.defaultCover ?? null,
        });
        submitted += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        failed.push({ jobId: pick.jobId, reason: message });
        this.logger.warn(`Rage-apply failed for job=${pick.jobId}: ${message}`, CTX);
      }
    }

    return {
      attempted: picks.length,
      submitted,
      skippedExisting,
      failed,
    };
  }
}
