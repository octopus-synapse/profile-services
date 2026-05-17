/**
 * Jobs Bounded Context Exceptions
 */
import {
  ConflictException,
  DomainException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class NoPrimaryResumeException extends ConflictException {
  override readonly code: string = 'NO_PRIMARY_RESUME';
  constructor() {
    super('User has no primary resume to compute fit score against');
  }
}

export class CannotApplyToOwnJobException extends ForbiddenException {
  override readonly code: string = 'CANNOT_APPLY_TO_OWN_JOB';
  constructor() {
    super('You cannot apply to your own job');
  }
}

export class CannotModifyOthersJobException extends ForbiddenException {
  override readonly code: string = 'CANNOT_MODIFY_OTHERS_JOB';
  constructor(action: 'update' | 'delete') {
    super(`You can only ${action} your own jobs`);
  }
}

export class NotJobOwnerException extends ForbiddenException {
  override readonly code: string = 'NOT_JOB_OWNER';
  constructor() {
    super('Only the job owner can perform this action');
  }
}

export class ApplicationNotOwnedException extends ForbiddenException {
  override readonly code: string = 'APPLICATION_NOT_OWNED';
  constructor() {
    super('You do not own this application');
  }
}

export class InvalidOccurredAtException extends ValidationException {
  override readonly code: string = 'INVALID_OCCURRED_AT';
  constructor(reason: 'future' | 'before_application') {
    super(
      reason === 'future'
        ? 'occurredAt cannot be in the future'
        : 'occurredAt cannot precede the application creation date',
    );
  }
}

export class JobImportInvalidUrlException extends DomainException {
  readonly code: string = 'JOB_IMPORT_INVALID_URL';
  readonly statusHint = 422;
  constructor() {
    super('The URL provided is not a valid HTTP/HTTPS URL');
  }
}

export class JobImportFetchFailedException extends DomainException {
  readonly code: string = 'JOB_IMPORT_FETCH_FAILED';
  readonly statusHint = 502;
  constructor() {
    super('Could not fetch the URL within the allowed window');
  }
}

export class JobImportPageTooThinException extends DomainException {
  readonly code: string = 'JOB_IMPORT_PAGE_TOO_THIN';
  readonly statusHint = 422;
  constructor() {
    super('The page did not contain enough text to extract a job posting');
  }
}

/**
 * P1 #24 — raised when an application state transition is rejected by
 * the use-case-level state machine (e.g. trying to withdraw an
 * already-WITHDRAWN or REJECTED row).
 */
export class InvalidApplicationStateException extends ConflictException {
  override readonly code: string = 'INVALID_APPLICATION_STATE';
  constructor(currentStatus: string, attemptedTransition: string) {
    super(`Cannot ${attemptedTransition} an application in status ${currentStatus}`);
  }
}
