/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class MecCsvBlockedException extends DomainException {
  readonly code: string = 'MEC_CSV_BLOCKED';
  readonly statusHint = 502;
  constructor() {
    super('Received HTML instead of CSV - Cloudflare may still be blocking');
  }
}
