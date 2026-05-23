import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runGuardedJob } from '@/shared-kernel/jobs';
import type { TimeCapsuleService } from './time-capsule.service';

const CTX = 'TimeCapsuleWorker';
// p99 from production: anniversary scan + email enqueue completes
// well under 4 minutes even on the busiest days.
const EXPECTED_DURATION_MS = 4 * 60_000;

/**
 * Framework-free POJO. Wired by the time-capsule module via
 * `CronPort` (Nest cron adapter lives in
 * `infrastructure/nest-adapter/nest-cron.adapter.ts`).
 *
 * Schedule: daily at 08:30 UTC — early enough to land in the morning
 * inbox.
 *
 * P0-010: wrapped with `runGuardedJob` so multi-instance deploys don't
 * double-send anniversary emails. Lock TTL = max(2 × expected, 5min).
 */
export class TimeCapsuleWorker {
  constructor(
    private readonly service: TimeCapsuleService,
    private readonly logger: LoggerPort,
    private readonly lock: DistributedLockPort,
  ) {}

  async run(): Promise<void> {
    await runGuardedJob(
      {
        name: CTX,
        expectedDurationMs: EXPECTED_DURATION_MS,
        failureMode: 'LOG_AND_CONTINUE',
        lock: this.lock,
        logger: this.logger,
      },
      async () => {
        const result = await this.service.sendAnniversaries();
        this.logger.log(`Time capsule: ${result.sent} sent / ${result.checked} checked`, CTX);
      },
    );
  }
}
