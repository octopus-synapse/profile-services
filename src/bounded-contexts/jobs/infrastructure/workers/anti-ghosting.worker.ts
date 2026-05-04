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
 */

import type { LoggerPort } from '@/shared-kernel';
import type { JobsUseCases } from '../../application/ports/jobs.port';

const CTX = 'AntiGhostingWorker';

export class AntiGhostingWorker {
  constructor(
    private readonly bc: JobsUseCases,
    private readonly logger: LoggerPort,
  ) {}

  async run(): Promise<void> {
    try {
      const result = await this.bc.runAntiGhostingSweep.execute();
      this.logger.log(
        `Anti-ghosting scan: ${result.scanned} apps checked, ${result.reminded} reminders sent`,
        CTX,
      );
    } catch (err) {
      this.logger.error(`Anti-ghosting scan failed: ${err instanceof Error ? err.message : 'unknown'}`, { context: CTX, stack: err instanceof Error ? err.stack : undefined });
    }
  }
}
