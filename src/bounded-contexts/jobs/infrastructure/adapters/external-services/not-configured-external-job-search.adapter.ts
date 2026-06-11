/**
 * Inert `ExternalJobSearchPort` wired when `JSEARCH_RAPIDAPI_KEY`/`HOST`
 * are absent. The ingestion cron is not registered in that case, so this
 * only fires on a manual/unexpected invocation — and fails loud instead
 * of silently returning an empty batch.
 */

import { JSearchNotConfiguredException } from '../../../domain/exceptions/external-jobs.exceptions';
import {
  ExternalJobSearchPort,
  type ExternalJobSearchResult,
} from '../../../domain/ports/external-job-search.port';

export class NotConfiguredExternalJobSearchAdapter extends ExternalJobSearchPort {
  async search(): Promise<ExternalJobSearchResult> {
    throw new JSearchNotConfiguredException();
  }
}
