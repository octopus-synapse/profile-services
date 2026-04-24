import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

export const DAILY_RECOMMENDATIONS_QUEUE = 'daily-recommendations';

export type DailyRecommendationsJobData =
  | { readonly kind: 'schedule' }
  | { readonly kind: 'compute-for-user'; readonly userId: string };

/**
 * Scheduled Match Score precomputation for recommendation emails.
 *
 * The plan calls for a cron every 3 days that walks users' areas-of-interest,
 * ranks jobs by Match Score, and drops the top 10 into an email queue.
 * Implementing the full pipeline (scanning, ranking, email rendering,
 * rate limiting) is substantial — so in Task #20 we ship only the
 * scheduling skeleton: the cron fires, the worker logs, and the job
 * handler is stubbed with a TODO.
 *
 * Feature flag `scoring.match.daily-recommendations` gates this off
 * by default per the registry; when ops flip it on and the body is
 * implemented in a follow-up, the cron is already in place.
 */
@Injectable()
@Processor(DAILY_RECOMMENDATIONS_QUEUE, { concurrency: 2 })
export class DailyRecommendationsWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DailyRecommendationsWorker.name);

  constructor(
    @InjectQueue(DAILY_RECOMMENDATIONS_QUEUE)
    private readonly queue: Queue<DailyRecommendationsJobData>,
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
      // TODO(scoring): scan active users (lastLoginAt < 30d), fan out
      // one `compute-for-user` job per user bounded to their areas of
      // interest, respect the `scoring.match.daily-recommendations`
      // feature flag. Full body in a follow-up.
      this.logger.log('daily-recommendations schedule tick — body not yet implemented');
      return;
    }
    if (job.data.kind === 'compute-for-user') {
      // TODO(scoring): for each job in the user's areas of interest,
      // compute Match Score, rank top-10, enqueue a "recommendations
      // ready" email job. The email pipeline lives in notifications/.
      this.logger.log(`daily-recommendations: skipping user=${job.data.userId} (stub)`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<DailyRecommendationsJobData>, err: Error): void {
    this.logger.error(`daily-recommendations failed kind=${job?.data?.kind} err=${err.message}`);
  }
}
