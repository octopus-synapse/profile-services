/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class MecCsvNoResponseException extends DomainException {
  readonly code: string = 'MEC_CSV_NO_RESPONSE';
  readonly statusHint = 502;
  constructor() {
    super('No response received from MEC CSV source');
  }
}
