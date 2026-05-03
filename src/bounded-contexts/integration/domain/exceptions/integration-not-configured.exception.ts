/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class IntegrationNotConfiguredException extends DomainException {
  readonly code: string = 'INTEGRATION_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor(provider: string) {
    super(`${provider} integration is not configured on this instance`);
  }
}
