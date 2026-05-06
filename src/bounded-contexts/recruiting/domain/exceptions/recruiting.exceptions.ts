/**
 * Recruiting Bounded Context Exceptions
 *
 * Covers the input + pool invariants of the reverse candidate matcher
 * (job → ranked candidates). Failures here map to a stable code so the
 * recruiter UI can render meaningful empty states.
 */
import { DomainException, ValidationException } from '@/shared-kernel/exceptions';

export class MatchCandidatesInvalidLimitException extends ValidationException {
  override readonly code: string = 'MATCH_CANDIDATES_INVALID_LIMIT';
  constructor(received: number) {
    super(`limit must be between 1 and 100 (received ${received})`);
  }
}

export class MatchCandidatesNoCriteriaException extends ValidationException {
  override readonly code: string = 'MATCH_CANDIDATES_NO_CRITERIA';
  constructor() {
    super(
      'At least one matching criterion is required (jobSkills, jobMinEnglish, or jobRemotePolicy)',
    );
  }
}

export class CandidatePoolEmptyException extends DomainException {
  readonly code: string = 'CANDIDATE_POOL_EMPTY';
  readonly statusHint = 404;
  constructor() {
    super('No opt-in candidates match the requested criteria');
  }
}

export class CandidateDirectoryUnavailableException extends DomainException {
  readonly code: string = 'CANDIDATE_DIRECTORY_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('Candidate directory is temporarily unavailable');
  }
}
