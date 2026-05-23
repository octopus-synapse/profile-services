/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class GitHubSummaryFetchFailedException extends DomainException {
  readonly code: string = 'GITHUB_SUMMARY_FETCH_FAILED';
  readonly statusHint = 502;
  constructor() {
    super('Failed to fetch GitHub summary');
  }
}
