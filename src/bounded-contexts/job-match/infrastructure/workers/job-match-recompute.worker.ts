import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { LoggerPort } from '@/shared-kernel';

export const JOB_MATCH_RECOMPUTE_QUEUE = 'job-match-recompute';

export type JobMatchRecomputeJobData =
  | { readonly kind: 'invalidate-resume'; readonly resumeId: string }
  | { readonly kind: 'invalidate-job'; readonly jobId: string }
  | { readonly kind: 'invalidate-user'; readonly userId: string };

/**
 * Background invalidator for the Match Score cache.
 *
 * The design favours invalidation over proactive recompute: Match Score
 * is on-demand (the plan calls it "on-demand + Redis cache with TTL"),
 * so the cheapest correct behaviour on a signal change is to drop the
 * stale entries and let the next request rebuild them. Full proactive
 * "precompute top-N matches per user every 3 days" lives in the
 * daily-recommendations worker; this one is pure cache hygiene.
 *
 * Event subscriptions are intentionally narrow — only `ResumeUpdated`
 * in this MVP. Job-level and fit-profile events flow in later when
 * their owning contexts grow proper domain events. The `@OnEvent`
 * listener that fans out events into this queue lives in
 * `infrastructure/handlers/job-match-recompute-on-resume-updated.handler.ts`.
 *
 * Framework-free POJO. Wired by `registerJobMatchJobs` via
 * `JobQueuePort`.
 */
const CTX = 'JobMatchRecomputeWorker';

export class JobMatchRecomputeWorker {
  constructor(
    private readonly cache: CacheService,
    private readonly logger: LoggerPort,
  ) {}

  async process(job: { data: JobMatchRecomputeJobData; id?: string }): Promise<void> {
    const pattern = this.patternFor(job.data);
    if (!pattern) return;
    try {
      await this.cache.deletePattern(pattern);
      this.logger.log(`Match cache invalidated via pattern=${pattern}`, CTX);
    } catch (err) {
      this.logger.error(`Match cache invalidation failed pattern=${pattern} err=${(err as Error).message}`, { context: CTX, stack: (err as Error).stack });
      throw err;
    }
  }

  /** Redis glob — the orchestrator keys breakdowns as
   * `match:match:{ resumeId }:{ jobId }:{ userId }:{ rulesVersion }` so each
   * of the three invalidation axes maps to a single wildcard pattern. */
  private patternFor(data: JobMatchRecomputeJobData): string | null {
    switch (data.kind) {
      case 'invalidate-resume':
        return `match:match:${data.resumeId}:*`;
      case 'invalidate-job':
        return `match:match:*:${data.jobId}:*`;
      case 'invalidate-user':
        return `match:match:*:*:${data.userId}:*`;
      default:
        return null;
    }
  }
}
