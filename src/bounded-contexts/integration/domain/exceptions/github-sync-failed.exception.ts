/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class GitHubSyncFailedException extends DomainException {
  readonly code: string = 'GITHUB_SYNC_FAILED';
  readonly statusHint = 502;
  constructor() {
    super('Failed to sync GitHub data');
  }
}
