import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runGuardedJob } from '@/shared-kernel/jobs';
import type { NotificationsUseCases } from '../../application/ports/notifications.port';

const CTX = 'WeeklyDigestWorker';
// p99: weekly aggregation is heavier than daily; budget 15 minutes.
const EXPECTED_DURATION_MS = 15 * 60_000;

/**
 * Weekly Digest Worker
 *
 * Runs every Monday at 13:00 UTC (≈ 10:00 BRT / 09:00 EDT) and
 * triggers `SendWeeklyDigestsUseCase` to email each opted-in user a
 * summary of their last 7 days: resume views, profile views, new
 * followers, endorsements.
 *
 * Idempotent via `UserWeeklyDigestLog`. P0-010 adds a distributed lock
 * so multi-instance deploys don't race the same weekly anchor.
 *
 * Framework-free POJO. Wired by `registerNotificationsJobs` via
 * `CronPort`.
 */
export class WeeklyDigestWorker {
  constructor(
    private readonly bc: NotificationsUseCases,
    private readonly logger: LoggerPort,
    private readonly lock: DistributedLockPort,
  ) {}

  async run(): Promise<void> {
    await runGuardedJob(
      {
        name: CTX,
        expectedDurationMs: EXPECTED_DURATION_MS,
        failureMode: 'FAIL_FAST',
        lock: this.lock,
        logger: this.logger,
      },
      async () => {
        const result = await this.bc.sendWeeklyDigests.execute();
        this.logger.log(
          `Weekly digest sent to ${result.usersEmailed} users (${result.usersSkipped} skipped)`,
          CTX,
        );
      },
    );
  }
}
