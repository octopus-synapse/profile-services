import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoggerPort } from '@/shared-kernel';
import { NotificationsUseCases } from '../../application/ports/notifications.port';

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
 */
@Injectable()
export class WeeklyDigestWorker {
  constructor(
    private readonly bc: NotificationsUseCases,
    private readonly logger: LoggerPort,
  ) {}

  @Cron('0 13 * * 1')
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
      this.logger.error(`Weekly digest failed: ${message}`, stack, CTX);
      throw error;
    }
  }
}
