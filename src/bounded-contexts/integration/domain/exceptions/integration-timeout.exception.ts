/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class IntegrationTimeoutException extends DomainException {
  readonly code: string = 'INTEGRATION_TIMEOUT';
  readonly statusHint = 504;
  constructor(provider: string) {
    super(`Request to ${provider} timed out`);
  }
}
