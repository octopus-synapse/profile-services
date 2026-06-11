/**
 * Cron-triggered JSearch ingestion run. Thin wrapper — all batch logic
 * (queries, quota, dedup, retention) lives in
 * `ExternalJobsIngestionService` so it can be unit-tested without the
 * scheduler.
 */

import type {
  ExternalJobsIngestionService,
  IngestionSummary,
} from '../../services/external-jobs-ingestion.service';

export class RunExternalJobsIngestionUseCase {
  constructor(private readonly ingestion: ExternalJobsIngestionService) {}

  async execute(now?: Date): Promise<IngestionSummary> {
    return this.ingestion.run(now);
  }
}
