/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class IntegrationResponseInvalidException extends DomainException {
  readonly code: string = 'INTEGRATION_RESPONSE_INVALID';
  readonly statusHint = 502;
  constructor(provider: string, reason: string) {
    super(`${provider} returned invalid response: ${reason}`);
  }
}
