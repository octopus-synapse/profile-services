/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { UnauthorizedException } from '@/shared-kernel/exceptions';

/**
 * Internal Token Invalid Exception
 *
 * Raised when the provided `x-internal-token` header doesn't match the
 * configured secret (timing-safe comparison).
 */
export class InternalTokenInvalidException extends UnauthorizedException {
  override readonly code: string = 'INTERNAL_TOKEN_INVALID';
  constructor() {
    super('Invalid internal token');
  }
}
