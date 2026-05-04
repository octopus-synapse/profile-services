import type { LoggerPort } from '@/shared-kernel';
import type { NotificationsUseCases } from '../../application/ports/notifications.port';

const CTX = 'WeeklyDigestWorker';

/**
 * Weekly Digest Worker
 *
 * Runs every Monday at 13:00 UTC (≈ 10:00 BRT / 09:00 EDT) and
 * triggers `SendWeeklyDigestsUseCase` to email each opted-in user a
 * summary of their last 7 days: resume views, profile views, new
 * followers, endorsements.
 *
 * Idempotent via `UserWeeklyDigestLog`.
 *
 * Framework-free POJO. Wired by `registerNotificationsJobs` via
 * `CronPort`.
 */
export class WeeklyDigestWorker {
  constructor(
    private readonly bc: NotificationsUseCases,
    private readonly logger: LoggerPort,
  ) {}

  async run(): Promise<void> {
    try {
      const result = await this.bc.sendWeeklyDigests.execute();
      this.logger.log(
        `Weekly digest sent to ${result.usersEmailed} users (${result.usersSkipped} skipped)`,
        CTX,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Weekly digest failed: ${message}`, { context: CTX, stack: stack });
      throw error;
    }
  }
}
