/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class MecCsvEmptyException extends DomainException {
  readonly code: string = 'MEC_CSV_EMPTY';
  readonly statusHint = 502;
  constructor() {
    super('CSV file is empty or has no data rows');
  }
}
