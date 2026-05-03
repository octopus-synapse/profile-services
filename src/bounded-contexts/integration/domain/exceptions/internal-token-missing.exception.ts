/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { UnauthorizedException } from '@/shared-kernel/exceptions';

/**
 * Internal Token Missing Exception
 *
 * Raised when the `x-internal-token` header is absent from a request hitting
 * an internal endpoint.
 */
export class InternalTokenMissingException extends UnauthorizedException {
  readonly code: string = 'INTERNAL_TOKEN_MISSING';
  constructor(headerName: string) {
    super(`Missing ${headerName} header`);
  }
}
