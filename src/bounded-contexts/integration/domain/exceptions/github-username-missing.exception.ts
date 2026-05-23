/**
 * Integration Bounded Context Exceptions
 *
 * Covers external connectors: GitHub, LinkedIn, Lattes, Google Scholar,
 * Orcid, SendGrid, PostHog, etc.
 */
import { ValidationException } from '@/shared-kernel/exceptions';

export class GitHubUsernameMissingException extends ValidationException {
  override readonly code: string = 'GITHUB_USERNAME_MISSING';
  constructor() {
    super('No GitHub username found in resume');
  }
}
