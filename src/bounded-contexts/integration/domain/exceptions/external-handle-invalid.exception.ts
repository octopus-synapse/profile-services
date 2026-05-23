/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class ExternalHandleInvalidException extends ValidationException {
  override readonly code: string = 'EXTERNAL_HANDLE_INVALID';
  constructor(provider: string) {
    super(`The ${provider} handle provided is not valid`);
  }
}
