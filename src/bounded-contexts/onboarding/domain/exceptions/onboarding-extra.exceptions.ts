/**
 * Extra Onboarding Exceptions
 *
 * The existing onboarding.exceptions.ts covers the structured validation
 * factory; this file hosts the standalone business rules that come up
 * during onboarding orchestration.
 */
import {
  ConflictException,
  DomainException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class OnboardingAlreadyCompletedException extends ConflictException {
  override readonly code: string = 'ONBOARDING_ALREADY_COMPLETED';
  constructor() {
    super('Onboarding is already completed for this user');
  }
}

export class OnboardingSessionExpiredException extends DomainException {
  readonly code: string = 'ONBOARDING_SESSION_EXPIRED';
  readonly statusHint = 410;
  constructor() {
    super('Onboarding session has expired');
  }
}

/**
 * Onboarding Completion In Progress Exception
 *
 * Raised when a concurrent onboarding completion attempt is detected — the
 * distributed lock is held by a previous request. The UI should wait and
 * let the first request finish rather than retry.
 */
export class OnboardingCompletionInProgressException extends ConflictException {
  override readonly code: string = 'ONBOARDING_COMPLETION_IN_PROGRESS';
  constructor() {
    super('Onboarding completion already in progress');
  }
}

/**
 * Onboarding Already At Last Step Exception
 *
 * Raised when the user tries to advance past the final step — there's
 * nowhere to go.
 */
export class OnboardingAlreadyAtLastStepException extends ValidationException {
  override readonly code: string = 'ONBOARDING_ALREADY_AT_LAST_STEP';
  constructor() {
    super('Already at the last step');
  }
}

/**
 * Onboarding Already At First Step Exception
 *
 * Raised when the user tries to go back from the first step.
 */
export class OnboardingAlreadyAtFirstStepException extends ValidationException {
  override readonly code: string = 'ONBOARDING_ALREADY_AT_FIRST_STEP';
  constructor() {
    super('Already at the first step');
  }
}

/**
 * Onboarding Unknown Step Exception
 *
 * Raised when `goto` receives a stepId that isn't part of the current
 * onboarding configuration (stale client, typo, removed step).
 */
export class OnboardingUnknownStepException extends ValidationException {
  override readonly code: string = 'ONBOARDING_UNKNOWN_STEP';
  constructor(stepId: string) {
    super(`Unknown step: ${stepId}`);
  }
}

/**
 * Onboarding Invalid Section Type Exception
 *
 * Raised when a section payload sets `noData: true` but also ships with
 * items — those two states are mutually exclusive. Message encodes which
 * section was invalid for UI field highlighting.
 */
export class OnboardingInvalidSectionTypeException extends ValidationException {
  override readonly code: string = 'ONBOARDING_INVALID_SECTION_TYPE';
  constructor(sectionTypeKey: string) {
    super(
      `Cannot have items for section "${sectionTypeKey}" when noData is true. ` +
        'Either set noData to false or provide an empty items array.',
    );
  }
}

/**
 * Onboarding Username Taken Exception
 *
 * Raised when the username submitted during onboarding is already claimed
 * by another user. BC isolation keeps this a local sibling to
 * identity/users' `UsernameTakenException` while sharing the same
 * machine-readable code (`USERNAME_TAKEN`) so the i18n catalog dedupes.
 */
export class OnboardingUsernameTakenException extends ConflictException {
  override readonly code: string = 'USERNAME_TAKEN';
  constructor() {
    super('Username is already taken');
  }
}

/**
 * Wraps an unexpected persistence failure during onboarding section
 * persistence (Prisma error, transaction rollback, etc.). The audit
 * trail preserves the original cause; this exception carries the stable
 * code so the i18n filter can translate the response.
 */
export class OnboardingSectionPersistenceFailedException extends DomainException {
  readonly code: string = 'ONBOARDING_SECTION_PERSISTENCE_FAILED';
  readonly statusHint = 500;
  constructor(
    public readonly sectionTypeKey: string,
    detail?: string,
  ) {
    super(`Failed to persist onboarding section "${sectionTypeKey}"${detail ? `: ${detail}` : ''}`);
  }
}
