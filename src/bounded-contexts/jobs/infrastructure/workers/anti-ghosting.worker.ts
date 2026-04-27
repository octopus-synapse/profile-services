/**
 * Cron-driven worker that fires the anti-ghosting sweep every day at
 * 9am. The worker itself only knows how to schedule + log — all the
 * actual silence-detection logic lives in
 * `RunAntiGhostingSweepUseCase` so it can be unit-tested without
 * Nest's scheduler.
 */

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerPort } from '@/shared-kernel';
import { JobsUseCases } from '../../application/ports/jobs.port';

const CTX = 'AntiGhostingWorker';

@Injectable()
export class AntiGhostingWorker {
  constructor(
    private readonly bc: JobsUseCases,
    private readonly logger: LoggerPort,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async run(): Promise<void> {
    try {
      const result = await this.bc.runAntiGhostingSweep.execute();
      this.logger.log(
        `Anti-ghosting scan: ${result.scanned} apps checked, ${result.reminded} reminders sent`,
        CTX,
      );
    } catch (err) {
      this.logger.error(
        `Anti-ghosting scan failed: ${err instanceof Error ? err.message : 'unknown'}`,
        err instanceof Error ? err.stack : undefined,
        CTX,
      );
    }
  }
}
