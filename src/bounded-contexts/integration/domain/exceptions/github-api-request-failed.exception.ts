/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class GitHubApiRequestFailedException extends DomainException {
  readonly code: string = 'GITHUB_API_REQUEST_FAILED';
  readonly statusHint = 502;
  constructor(path: string, status: number) {
    super(`GitHub API ${path} ${status}`);
  }
}
