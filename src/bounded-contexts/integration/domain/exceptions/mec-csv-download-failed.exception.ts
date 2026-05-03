/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class MecCsvDownloadFailedException extends DomainException {
  readonly code: string = 'MEC_CSV_DOWNLOAD_FAILED';
  readonly statusHint = 502;
  constructor(reason: string) {
    super(`MEC CSV download failed: ${reason}. No cache available.`);
  }
}
