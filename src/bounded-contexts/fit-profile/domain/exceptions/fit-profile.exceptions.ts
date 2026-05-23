/**
 * Fit Profile bounded-context exceptions used by the
 * `RequireFitProfileGuard` and the JobFitProfile controller.
 */
import {
  ConflictException,
  EntityNotFoundException,
  UnauthorizedException,
} from '@/shared-kernel/exceptions';

/**
 * `request.user` was not populated when a guard ran — usually means the
 * route forgot a `JwtAuthGuard` upstream.
 */
export class AuthenticatedUserMissingException extends UnauthorizedException {
  override readonly code: string = 'AUTHENTICATED_USER_MISSING';
  constructor() {
    super('Authenticated user not present on request');
  }
}

/**
 * Standard user hit a route that requires a current fit-profile vector,
 * but their profile was never built or has expired.
 */
export class FitProfileRequiredException extends ConflictException {
  override readonly code: string = 'FIT_PROFILE_REQUIRED';
  constructor(public readonly status: 'never' | 'expired') {
    super(
      status === 'expired'
        ? 'Fit profile has expired. Re-answer the questionnaire.'
        : 'Fit profile is required for this action.',
    );
  }
}

/** Job has no `JobFitProfile` row associated yet. */
export class JobFitProfileNotSetException extends EntityNotFoundException {
  override readonly code: string = 'JOB_FIT_PROFILE_NOT_SET';
  constructor(jobId?: string) {
    super('JobFitProfile', jobId);
  }
}

/** Admin GET / PATCH against a `FitQuestion` id that doesn't exist. */
export class FitQuestionNotFoundException extends EntityNotFoundException {
  override readonly code: string = 'FIT_QUESTION_NOT_FOUND';
  constructor(id: string) {
    super('FitQuestion', id);
  }
}
