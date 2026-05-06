/**
 * Rage Apply use case.
 *
 * Big-red-button orchestrator: pick every job above `minFit`, AI-tailor
 * a variant for each, submit a JobApplication. Bounded by
 * `maxApplications` so a slip of the finger doesn't send 500 CVs.
 * Reuses the same tailoring + application code paths as the scheduled
 * auto-apply worker so success metrics remain apples-to-apples.
 */

import { LoggerPort } from '@/shared-kernel';
import type { CacheLock, CachePort } from '@/shared-kernel/cache/cache.port';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  RageApplyFailure,
  RageApplyInput,
  RageApplyResult,
} from '../../../domain/entities/rage-apply';
import {
  AutoApplyAlreadyRunningException,
  RageApplyLimitReachedException,
  RageApplyMinFitInvalidException,
} from '../../../domain/exceptions/automation.exceptions';
import { RageApplyRepositoryPort } from '../../../domain/ports/rage-apply.repository.port';
// P1-046 — depend on the typed port instead of the cross-BC service
// import. Composition root wires the concrete adapter.
import { ResumeTailorPort } from '../../ports/resume-tailor.port';
import { CuratedSelectorService } from '../../services/curated-selector.service';

export type { RageApplyFailure, RageApplyInput, RageApplyResult };

const DEFAULT_MIN_FIT = 80;
const DEFAULT_MAX_APPLICATIONS = 20;
const DEFAULT_SINCE_DAYS = 7;
const MAX_APPLICATIONS_CAP = 100;
/** Hard daily ceiling on rage-apply runs per user — protects recruiters
 *  from the same big-red-button being mashed N times in a row. */
const RAGE_APPLY_DAILY_LIMIT = 3;
/** TTL on the in-flight lock — long enough to cover a slow tailoring
 *  pass, short enough that a crashed worker doesn't lock the user out
 *  for hours. */
const RAGE_APPLY_LOCK_TTL_SECONDS = 10 * 60;

const CTX = 'RunRageApplyUseCase';

export class RunRageApplyUseCase {
  constructor(
    private readonly repository: RageApplyRepositoryPort,
    private readonly selector: CuratedSelectorService,
    private readonly tailor: ResumeTailorPort,
    private readonly logger: LoggerPort,
    /** Optional in-flight lock + daily counter store. When omitted the
     *  use case skips concurrency / daily-limit guards entirely (kept
     *  optional so existing in-process / unit-test wiring stays
     *  zero-config). */
    private readonly cache?: CachePort,
  ) {}

  async execute(input: RageApplyInput): Promise<RageApplyResult> {
    if (input.minFit !== undefined && (input.minFit < 0 || input.minFit > 100)) {
      throw new RageApplyMinFitInvalidException();
    }

    const user = await this.repository.findUserSnapshot(input.userId);
    if (!user?.isActive) {
      throw new EntityNotFoundException('User', input.userId);
    }
    if (!user.primaryResumeId) {
      throw new EntityNotFoundException('Resume', 'primary');
    }
    const primaryResumeId = user.primaryResumeId;

    // Concurrency + daily-limit guards. Both are best-effort: when no
    // CachePort is wired the user is on the legacy code path and we
    // simply proceed.
    const lockKey = `rage-apply:lock:${input.userId}`;
    const counterKey = `rage-apply:daily:${input.userId}:${todayKey()}`;
    let lock: CacheLock | null = null;
    if (this.cache) {
      const todayCount = (await this.cache.get<number>(counterKey)) ?? 0;
      if (todayCount >= RAGE_APPLY_DAILY_LIMIT) {
        throw new RageApplyLimitReachedException(RAGE_APPLY_DAILY_LIMIT);
      }
      lock = await this.cache.acquireLock(lockKey, RAGE_APPLY_LOCK_TTL_SECONDS);
      if (!lock) {
        throw new AutoApplyAlreadyRunningException();
      }
    }

    try {
      const minFit = input.minFit ?? user.applyCriteria?.minFit ?? DEFAULT_MIN_FIT;
      const maxApps = Math.min(
        input.maxApplications ?? DEFAULT_MAX_APPLICATIONS,
        MAX_APPLICATIONS_CAP,
      );
      const since = input.since ?? new Date(Date.now() - DEFAULT_SINCE_DAYS * 24 * 60 * 60 * 1000);

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

      if (this.cache) {
        const next = ((await this.cache.get<number>(counterKey)) ?? 0) + 1;
        // 36h TTL — covers the day the run started even if the user
        // crosses a UTC midnight boundary mid-batch.
        await this.cache.set(counterKey, next, 36 * 60 * 60);
      }

      return {
        attempted: picks.length,
        submitted,
        skippedExisting,
        failed,
      };
    } finally {
      if (lock) await lock.release();
    }
  }
}

function todayKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}
