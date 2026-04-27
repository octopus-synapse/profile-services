/**
 * Fetch a careers-page URL and return an LLM-extracted job preview.
 * Thin wrapper over `JobImportService` so the controller stays a
 * one-liner and the orchestration is testable in isolation.
 */

import {
  type JobImportResult,
  JobImportService,
} from '../../services/job-import.service';

export type { JobImportResult };

export class ImportJobFromUrlUseCase {
  constructor(private readonly service: JobImportService) {}

  execute(url: string): Promise<JobImportResult> {
    return this.service.importFromUrl(url);
  }
}
