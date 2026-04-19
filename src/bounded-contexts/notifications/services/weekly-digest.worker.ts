import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WeeklyDigestService } from './weekly-digest.service';

/**
 * Weekly Digest Worker
 *
 * Runs every Monday at 13:00 UTC (≈ 10:00 BRT / 09:00 EDT) and emails
 * each active user a summary of their last 7 days: resume views,
 * profile views, new followers, endorsements.
 *
 * Idempotent via UserWeeklyDigestLog.
 */
@Injectable()
export class WeeklyDigestWorker {
  private readonly logger = new Logger(WeeklyDigestWorker.name);

  constructor(private readonly weekly: WeeklyDigestService) {}

  @Cron('0 13 * * 1')
  async run(): Promise<void> {
    try {
      const result = await this.weekly.sendWeeklyDigests();
      this.logger.log(
        `Weekly digest sent to ${result.usersEmailed} users (${result.usersSkipped} skipped)`,
      );
    } catch (error) {
      this.logger.error(
        `Weekly digest failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
