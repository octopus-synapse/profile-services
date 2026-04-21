/**
 * Shadow Profile sub-domain exceptions.
 *
 * Kept in-BC to respect bounded-context isolation (shadow-profile is a
 * sub-domain of identity/users and cannot import from `integration`).
 * The codes are shared with integration so the i18n catalog deduplicates.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class ShadowGitHubApiRequestFailedException extends DomainException {
  readonly code: string = 'GITHUB_API_REQUEST_FAILED';
  readonly statusHint = 502;
  constructor(path: string, status: number) {
    super(`GitHub API ${path} ${status}`);
  }
}
