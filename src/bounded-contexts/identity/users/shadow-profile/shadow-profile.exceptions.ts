/**
 * Shadow Profile sub-domain exceptions.
 *
 * Kept in-BC to respect bounded-context isolation (shadow-profile is a
 * sub-domain of identity/users and cannot import from `integration`).
 * The codes are shared with integration so the i18n catalog deduplicates.
 */
import { ConflictException, DomainException } from '@/shared-kernel/exceptions';

export class ShadowGitHubApiRequestFailedException extends DomainException {
  readonly code: string = 'GITHUB_API_REQUEST_FAILED';
  readonly statusHint = 502;
  constructor(path: string, status: number) {
    super(`GitHub API ${path} ${status}`);
  }
}

/**
 * Shadow Profile Not Found Exception
 *
 * Raised when the claim flow is handed an ID that doesn't match any
 * ShadowProfile row (stale link, already garbage-collected, spoofed, etc).
 */
export class ShadowProfileNotFoundException extends DomainException {
  readonly code: string = 'SHADOW_PROFILE_NOT_FOUND';
  readonly statusHint = 404;
  constructor() {
    super('Shadow profile not found');
  }
}

/**
 * Shadow Profile Already Claimed Exception
 *
 * Raised when a different user already claimed this shadow row — we never
 * reassign an existing claim; the UI surfaces an "already merged" toast.
 */
export class ShadowProfileAlreadyClaimedException extends ConflictException {
  override readonly code: string = 'SHADOW_PROFILE_ALREADY_CLAIMED';
  constructor() {
    super('Shadow profile already claimed by another user');
  }
}
