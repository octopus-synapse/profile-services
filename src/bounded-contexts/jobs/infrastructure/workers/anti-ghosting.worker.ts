/**
 * Cron-driven worker that fires the anti-ghosting sweep every day at
 * 9am. The worker itself only knows how to schedule + log — all the
 * actual silence-detection logic lives in
 * `RunAntiGhostingSweepUseCase` so it can be unit-tested without
 * Nest's scheduler.
 *
 * Framework-free POJO. Wired via `registerJobsJobs` against the
 * shared `CronPort` (Nest cron adapter lives in
 * `infrastructure/nest-adapter/nest-cron.adapter.ts`).
 *
 * P0-010: wrapped with `runGuardedJob` so multi-instance deploys don't
 * double-send anti-ghosting reminders. Lock TTL = max(2 × expected, 5min).
 */

import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runGuardedJob } from '@/shared-kernel/jobs';
import type { JobsUseCases } from '../../application/ports/jobs.port';

const CTX = 'AntiGhostingWorker';
// p99: full application sweep + reminder enqueue runs under 5 minutes.
const EXPECTED_DURATION_MS = 5 * 60_000;

export class AntiGhostingWorker {
  constructor(
    private readonly bc: JobsUseCases,
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
        const result = await this.bc.runAntiGhostingSweep.execute();
        this.logger.log(
          `Anti-ghosting scan: ${result.scanned} apps checked, ${result.reminded} reminders sent`,
          CTX,
        );
      },
    );
  }
}
