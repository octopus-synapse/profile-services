/**
 * Job-match bounded-context exceptions surfaced by the controller while
 * computing a user's match against a specific job posting.
 */
import {
  ConflictException,
  EntityNotFoundException,
  UnauthorizedException,
} from '@/shared-kernel/exceptions';

export class JobMatchAuthenticatedUserMissingException extends UnauthorizedException {
  override readonly code: string = 'JOB_MATCH_AUTHENTICATED_USER_MISSING';
  constructor() {
    super('Authenticated user is missing on the request.');
  }
}

export class JobMatchResumeNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'JOB_MATCH_RESUME_NOT_FOUND';
  constructor(resumeId?: string) {
    super('Resume', resumeId);
  }
}

export class JobMatchJobNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'JOB_MATCH_JOB_NOT_FOUND';
  constructor(jobId?: string) {
    super('Job', jobId);
  }
}

export class JobMatchFitProfileRequiredException extends ConflictException {
  override readonly code: string = 'JOB_MATCH_FIT_PROFILE_REQUIRED';
  constructor(public readonly status: 'never' | 'expired') {
    super(
      status === 'expired'
        ? 'Fit profile has expired. Re-answer the questionnaire to compute matches.'
        : 'Fit profile is required to compute matches.',
    );
  }
}
