import type { NotificationsUseCases } from '@/bounded-contexts/notifications/application/ports/notifications.port';
import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  RECOMMENDATIONS_TTL_SECONDS,
  type RecommendedMatch,
  recommendationsCacheKey,
} from '@/shared-kernel/cache';
import { runWithFailureMode } from '@/shared-kernel/jobs';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { ComputeMatchUseCase } from '../../application/use-cases/compute-match.use-case';

export const DAILY_RECOMMENDATIONS_QUEUE = 'daily-recommendations';

export type DailyRecommendationsJobData =
  | { readonly kind: 'schedule' }
  | { readonly kind: 'compute-for-user'; readonly userId: string };

const FEATURE_FLAG_KEY = 'scoring.match.daily-recommendations';
/** Stop scoring after the candidate set's top-N to bound cost. */
const TOP_N = 10;
/** Cap candidate jobs per user so a hot tech area doesn't blow up
 *  the AI bill — we'd rather miss a recommendation than DOS ourselves. */
const MAX_CANDIDATES_PER_USER = 30;
/** Active-user window. Anything stale beyond this gets no email. */
const ACTIVE_WINDOW_DAYS = 30;
/** Recency window for candidate jobs. Older listings don't surprise the
 *  user; recommend things they likely haven't seen yet. */
const JOB_RECENCY_DAYS = 7;

/**
 * Cron-driven Match Score precomputation for recommendation emails.
 *
 * Flow:
 *  1. Cron tick (every 3d at 04:00) → `schedule` job.
 *  2. `schedule` scans active users with a primary resume + valid fit
 *     profile, fans one `compute-for-user` job per user.
 *  3. `compute-for-user` loads the user's primary resume's `techArea`,
 *     queries recent matching jobs (capped), computes Match Score for
 *     each via `ComputeMatchUseCase`, keeps the top-N, and emits a
 *     `MATCH_RECOMMENDATIONS_READY` notification with the top-match
 *     title in the body.
 *
 * The `scoring.match.daily-recommendations` feature flag gates the
 * whole pipeline — when OFF the schedule job no-ops without enqueueing.
 *
 * Framework-free POJO. Wired by `registerJobMatchJobs` via
 * `JobQueuePort`.
 */
const CTX = 'DailyRecommendationsWorker';

export class DailyRecommendationsWorker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly flags: FeatureFlagService,
    private readonly computeMatch: ComputeMatchUseCase,
    private readonly notifications: NotificationsUseCases,
    private readonly queue: JobQueuePort,
    private readonly logger: LoggerPort,
  ) {}

  async process(job: { data: DailyRecommendationsJobData; id?: string }): Promise<void> {
    await runWithFailureMode({ worker: CTX, logger: this.logger }, 'RETRY', async () => {
      if (job.data.kind === 'schedule') {
        await this.fanOutActiveUsers();
        return;
      }
      if (job.data.kind === 'compute-for-user') {
        await this.computeForUser(job.data.userId);
      }
    });
  }

  private async fanOutActiveUsers(): Promise<void> {
    if (!(await this.flags.isEnabled(FEATURE_FLAG_KEY, null))) {
      this.logger.log('daily-recommendations: feature flag OFF — skipping schedule', CTX);
      return;
    }
    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    // Active = logged in within the window AND has both a primary
    // resume and a still-valid (vector populated, not yet expired) fit
    // profile. Without these we'd just produce an unactionable email.
    const candidates = await this.prisma.user.findMany({
      where: {
        lastLoginAt: { gte: cutoff },
        primaryResumeId: { not: null },
        fitProfile: {
          AND: [{ NOT: { vectorJson: { equals: 'null' } } }, { expiresAt: { gt: new Date() } }],
        },
      },
      select: { id: true },
    });
    this.logger.log(
      `daily-recommendations: fanning out for ${candidates.length} active users`,
      CTX,
    );
    for (const u of candidates) {
      await this.queue.enqueue<DailyRecommendationsJobData>(DAILY_RECOMMENDATIONS_QUEUE, {
        kind: 'compute-for-user',
        userId: u.id,
      });
    }
  }

  private async computeForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true, primaryResume: { select: { techArea: true } } },
    });
    if (!user?.primaryResumeId) return;

    const techArea = user.primaryResume?.techArea ?? null;
    // Recency window keeps the recommendation set fresh. We rank over the
    // EXTERNAL (JSearch) listings — the inventory the user actually browses
    // — now that the Match engine can score them (external job-loader).
    const recencyCutoff = new Date(Date.now() - JOB_RECENCY_DAYS * 24 * 60 * 60 * 1000);
    const listings = await this.prisma.externalJobListing.findMany({
      where: {
        fetchedAt: { gte: recencyCutoff },
        // Best-effort area scoping over the free-text copy (external rows
        // carry no structured `skills[]`). No `techArea` ⇒ score the whole
        // recent set — costlier but the honest fallback.
        ...(techArea
          ? {
              OR: [
                { title: { contains: techArea, mode: 'insensitive' as const } },
                { description: { contains: techArea, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: { id: true, title: true },
      take: MAX_CANDIDATES_PER_USER,
      orderBy: { fetchedAt: 'desc' },
    });
    if (listings.length === 0) return;

    const ranked: Array<{ externalJobId: string; title: string; score: number }> = [];
    for (const listing of listings) {
      try {
        const result = await this.computeMatch.execute({
          userId,
          resumeId: user.primaryResumeId,
          jobId: listing.id,
        });
        ranked.push({
          externalJobId: listing.id,
          title: listing.title,
          score: result.overallScore,
        });
      } catch (err) {
        // One bad listing shouldn't poison the batch. Log + continue.
        this.logger.warn(
          `daily-recommendations: compute failed user=${userId} job=${listing.id}: ${err instanceof Error ? err.message : 'unknown'}`,
          CTX,
        );
      }
    }
    ranked.sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, TOP_N);
    if (top.length === 0) return;

    // Persist the ranked top-N so `GET /v1/jobs/recommended` (jobs BC) can
    // read it and hydrate the listings — see the shared-kernel contract.
    const payload: RecommendedMatch[] = top.map((t) => ({
      externalJobId: t.externalJobId,
      score: t.score,
    }));
    await this.cache
      .set(recommendationsCacheKey(userId), payload, RECOMMENDATIONS_TTL_SECONDS)
      .catch((err) => {
        this.logger.warn(
          `daily-recommendations: cache write failed user=${userId}: ${err instanceof Error ? err.message : 'unknown'}`,
          CTX,
        );
      });

    try {
      await this.notifications.createNotification.execute({
        userId,
        type: 'MATCH_RECOMMENDATIONS_READY',
        actorId: 'system',
        message: `Encontramos ${top.length} novas vagas para você. Top match: "${top[0]?.title ?? ''}".`,
        entityType: 'User',
        entityId: userId,
      });
    } catch (err) {
      this.logger.warn(
        `daily-recommendations: notification failed user=${userId}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
    }
  }
}
