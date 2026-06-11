/**
 * Cron-driven worker firing the daily JSearch ingestion batch (06:00
 * America/Sao_Paulo). All batch logic lives in
 * `ExternalJobsIngestionService` — the worker only schedules + logs.
 *
 * P0-010: wrapped with `runGuardedJob` so multi-instance deploys don't
 * double-spend the RapidAPI monthly quota. The quota counter itself is
 * the second line of defense.
 */

import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runGuardedJob } from '@/shared-kernel/jobs';
import type { JobsUseCases } from '../../application/ports/jobs.port';

const CTX = 'ExternalJobsIngestionWorker';
// p99: 3 upstream calls (30s timeout each) + upserts stay under 2 min.
const EXPECTED_DURATION_MS = 2 * 60_000;

export class ExternalJobsIngestionWorker {
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
        await this.bc.runExternalJobsIngestion.execute();
      },
    );
  }
}
