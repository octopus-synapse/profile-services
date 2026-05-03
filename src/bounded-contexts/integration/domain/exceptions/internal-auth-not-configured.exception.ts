/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { UnauthorizedException } from '@/shared-kernel/exceptions';

/**
 * Internal Auth Not Configured Exception
 *
 * Raised when `INTERNAL_API_TOKEN` is missing on a request that tries to
 * use an internal endpoint — we deny access rather than silently allow
 * everyone through.
 */
export class InternalAuthNotConfiguredException extends UnauthorizedException {
  readonly code: string = 'INTERNAL_AUTH_NOT_CONFIGURED';
  constructor() {
    super('Internal API token not configured. Set INTERNAL_API_TOKEN environment variable.');
  }
}
