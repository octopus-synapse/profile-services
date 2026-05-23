/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class IntegrationRateLimitedException extends DomainException {
  readonly code: string = 'INTEGRATION_RATE_LIMITED';
  readonly statusHint = 503;
  constructor(provider: string, retryAfterSeconds?: number) {
    super(
      `${provider} rate-limited this request${retryAfterSeconds ? ` (retry in ${retryAfterSeconds}s)` : ''}`,
    );
  }
}
