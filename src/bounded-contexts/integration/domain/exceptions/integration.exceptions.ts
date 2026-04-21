/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException, ValidationException } from '@/shared-kernel/exceptions';

export class IntegrationAuthFailedException extends DomainException {
  readonly code: string = 'INTEGRATION_AUTH_FAILED';
  readonly statusHint = 502;
  constructor(provider: string) {
    super(`Authentication with ${provider} failed`);
  }
}

export class IntegrationRateLimitedException extends DomainException {
  readonly code: string = 'INTEGRATION_RATE_LIMITED';
  readonly statusHint = 503;
  constructor(provider: string, retryAfterSeconds?: number) {
    super(
      `${provider} rate-limited this request${retryAfterSeconds ? ` (retry in ${retryAfterSeconds}s)` : ''}`,
    );
  }
}

export class IntegrationTimeoutException extends DomainException {
  readonly code: string = 'INTEGRATION_TIMEOUT';
  readonly statusHint = 504;
  constructor(provider: string) {
    super(`Request to ${provider} timed out`);
  }
}

export class IntegrationResponseInvalidException extends DomainException {
  readonly code: string = 'INTEGRATION_RESPONSE_INVALID';
  readonly statusHint = 502;
  constructor(provider: string, reason: string) {
    super(`${provider} returned invalid response: ${reason}`);
  }
}

export class IntegrationNotConfiguredException extends DomainException {
  readonly code: string = 'INTEGRATION_NOT_CONFIGURED';
  readonly statusHint = 503;
  constructor(provider: string) {
    super(`${provider} integration is not configured on this instance`);
  }
}

export class ExternalHandleInvalidException extends ValidationException {
  readonly code: string = 'EXTERNAL_HANDLE_INVALID';
  constructor(provider: string) {
    super(`The ${provider} handle provided is not valid`);
  }
}

export class SyncCooldownActiveException extends ValidationException {
  readonly code: string = 'SYNC_COOLDOWN_ACTIVE';
  constructor(retryAfterMinutes: number) {
    super(`Sync cooldown is active. Try again in ${retryAfterMinutes} minutes`);
  }
}
