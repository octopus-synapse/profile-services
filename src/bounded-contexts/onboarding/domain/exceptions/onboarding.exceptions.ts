/**
 * Onboarding Validation Exceptions
 *
 * One subclass per failure shape — each carries a literal `code` and
 * `statusHint` so the arch test + catalog-parity test can enumerate them
 * statically. The previous design fed `code` through the constructor, which
 * made the audit regex blind and defeated TypeScript's abstract-member check.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export interface OnboardingValidationError {
  code: string;
  field: string;
  message: string;
}

/**
 * Shared base carrying the structured `details` payload and the legacy
 * `getResponse()` contract that the filter still reads. Subclasses below
 * declare the concrete `code` / `statusHint` / default message.
 */
export abstract class OnboardingValidationException extends DomainException {
  readonly statusHint = 400;

  constructor(
    message: string,
    public readonly details: OnboardingValidationError[] = [],
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  getResponse() {
    return {
      statusCode: this.statusHint,
      error: 'Onboarding Validation Failed',
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  // --- Factory helpers preserved for call-site compatibility ---------------

  static missingRequiredData(missing: string[]): OnboardingMissingRequiredDataException {
    return new OnboardingMissingRequiredDataException(missing);
  }

  static invalidPersonalInfo(
    errors: OnboardingValidationError[],
  ): OnboardingInvalidPersonalInfoException {
    return new OnboardingInvalidPersonalInfoException(errors);
  }

  static invalidProfessionalProfile(
    errors: OnboardingValidationError[],
  ): OnboardingInvalidProfessionalProfileException {
    return new OnboardingInvalidProfessionalProfileException(errors);
  }

  static invalidUsername(reason: string): OnboardingInvalidUsernameException {
    return new OnboardingInvalidUsernameException(reason);
  }

  static stepNotCompleted(stepId: string): OnboardingStepNotCompletedException {
    return new OnboardingStepNotCompletedException(stepId);
  }
}

export class OnboardingMissingRequiredDataException extends OnboardingValidationException {
  readonly code = 'ONBOARDING_INCOMPLETE';
  constructor(missing: string[]) {
    const details = missing.map((field) => ({
      code: 'REQUIRED_FIELD_MISSING',
      field,
      message: `${formatFieldName(field)} is required`,
    }));
    super(`Missing required data: ${missing.join(', ')}`, details);
  }
}

export class OnboardingInvalidPersonalInfoException extends OnboardingValidationException {
  readonly code = 'INVALID_PERSONAL_INFO';
  constructor(errors: OnboardingValidationError[]) {
    super('Personal information is invalid', errors);
  }
}

export class OnboardingInvalidProfessionalProfileException extends OnboardingValidationException {
  readonly code = 'INVALID_PROFESSIONAL_PROFILE';
  constructor(errors: OnboardingValidationError[]) {
    super('Professional profile is invalid', errors);
  }
}

export class OnboardingInvalidUsernameException extends OnboardingValidationException {
  readonly code = 'INVALID_USERNAME';
  constructor(reason: string) {
    super(reason, [{ code: 'INVALID_USERNAME', field: 'username', message: reason }]);
  }
}

export class OnboardingStepNotCompletedException extends OnboardingValidationException {
  readonly code = 'STEP_NOT_COMPLETED';
  constructor(stepId: string) {
    super(`Step "${stepId}" must be completed first`, [
      { code: 'STEP_INCOMPLETE', field: stepId, message: 'Complete this step before proceeding' },
    ]);
  }
}

export class OnboardingDataValidationFailedException extends OnboardingValidationException {
  readonly code = 'ONBOARDING_DATA_VALIDATION_FAILED';
  constructor(errors: OnboardingValidationError[]) {
    super('Invalid onboarding data', errors);
  }
}

export class OnboardingGenericValidationException extends OnboardingValidationException {
  readonly code = 'ONBOARDING_GENERIC_VALIDATION';
  constructor(message: string, errors: OnboardingValidationError[]) {
    super(message, errors);
  }
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
