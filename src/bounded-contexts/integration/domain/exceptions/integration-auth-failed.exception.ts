/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class IntegrationAuthFailedException extends DomainException {
  readonly code: string = 'INTEGRATION_AUTH_FAILED';
  readonly statusHint = 502;
  constructor(provider: string) {
    super(`Authentication with ${provider} failed`);
  }
}
