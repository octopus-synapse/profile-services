import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { CreateNotificationUseCase } from '@/bounded-contexts/notifications/application/use-cases/create-notification/create-notification.use-case';
import { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { ComputeMatchUseCase } from '../../application/use-cases/compute-match.use-case';

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
 */
const CTX = 'DailyRecommendationsWorker';

@Injectable()
@Processor(DAILY_RECOMMENDATIONS_QUEUE, { concurrency: 2 })
export class DailyRecommendationsWorker extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagService,
    private readonly computeMatch: ComputeMatchUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @InjectQueue(DAILY_RECOMMENDATIONS_QUEUE)
    private readonly queue: Queue<DailyRecommendationsJobData>,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Every 3 days at 04:00 America/Sao_Paulo. Offset from the
    // fit-profile-expire cron (03:00) so the two workers don't compete
    // for the same DB window.
    await this.queue.add(
      'daily-recommendations-schedule',
      { kind: 'schedule' },
      {
        repeat: { pattern: '0 4 */3 * *', tz: 'America/Sao_Paulo' },
        jobId: 'daily-recommendations-schedule-cron',
      },
    );
  }

  async process(job: Job<DailyRecommendationsJobData>): Promise<void> {
    if (job.data.kind === 'schedule') {
      await this.fanOutActiveUsers();
      return;
    }
    if (job.data.kind === 'compute-for-user') {
      await this.computeForUser(job.data.userId);
    }
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
      await this.queue.add('compute-for-user', { kind: 'compute-for-user', userId: u.id });
    }
  }

  private async computeForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true, primaryResume: { select: { techArea: true } } },
    });
    if (!user?.primaryResumeId) return;

    const techArea = user.primaryResume?.techArea ?? null;
    // Recency window keeps the recommendation set fresh.
    const recencyCutoff = new Date(Date.now() - JOB_RECENCY_DAYS * 24 * 60 * 60 * 1000);
    const jobs = await this.prisma.job.findMany({
      where: {
        createdAt: { gte: recencyCutoff },
        // Author exclusion: never recommend a user their own listing.
        authorId: { not: userId },
        // Best-effort area scoping. When the user has no `techArea`
        // (resume not categorised) we score over the whole recent set
        // — that costs more but is the honest fallback.
        ...(techArea
          ? {
              OR: [
                { skills: { has: techArea } },
                { title: { contains: techArea, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: { id: true, title: true },
      take: MAX_CANDIDATES_PER_USER,
      orderBy: { createdAt: 'desc' },
    });
    if (jobs.length === 0) return;

    const ranked: Array<{ jobId: string; title: string; score: number }> = [];
    for (const j of jobs) {
      try {
        const result = await this.computeMatch.execute({
          userId,
          resumeId: user.primaryResumeId,
          jobId: j.id,
        });
        ranked.push({ jobId: j.id, title: j.title, score: result.overallScore });
      } catch (err) {
        // One bad job shouldn't poison the batch. Log + continue.
        this.logger.warn(
          `daily-recommendations: compute failed user=${userId} job=${j.id}: ${err instanceof Error ? err.message : 'unknown'}`,
          CTX,
        );
      }
    }
    ranked.sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, TOP_N);
    if (top.length === 0) return;

    try {
      await this.createNotification.execute({
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

  @OnWorkerEvent('failed')
  onFailed(job: Job<DailyRecommendationsJobData>, err: Error): void {
    this.logger.error(
      `daily-recommendations failed kind=${job?.data?.kind} err=${err.message}`,
      err.stack,
      CTX,
    );
  }
}
