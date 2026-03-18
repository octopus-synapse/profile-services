import { BadRequestException, HttpStatus } from '@nestjs/common';

/**
 * Structured error response for onboarding validation failures.
 * Frontend displays these messages directly - no hardcoded validation needed.
 */
export interface OnboardingValidationError {
  code: string;
  field: string;
  message: string;
}

interface OnboardingExceptionResponse {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details: OnboardingValidationError[];
}

/**
 * Exception for onboarding validation failures.
 * Returns structured errors that frontend can display directly.
 */
export class OnboardingValidationException extends BadRequestException {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: OnboardingValidationError[] = [],
  ) {
    const response: OnboardingExceptionResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Onboarding Validation Failed',
      code,
      message,
      details,
    };
    super(response);
  }

  static missingRequiredData(missing: string[]): OnboardingValidationException {
    const details = missing.map((field) => ({
      code: 'REQUIRED_FIELD_MISSING',
      field,
      message: `${formatFieldName(field)} is required`,
    }));

    return new OnboardingValidationException(
      'ONBOARDING_INCOMPLETE',
      `Missing required data: ${missing.join(', ')}`,
      details,
    );
  }

  static invalidPersonalInfo(errors: OnboardingValidationError[]): OnboardingValidationException {
    return new OnboardingValidationException(
      'INVALID_PERSONAL_INFO',
      'Personal information is invalid',
      errors,
    );
  }

  static invalidProfessionalProfile(
    errors: OnboardingValidationError[],
  ): OnboardingValidationException {
    return new OnboardingValidationException(
      'INVALID_PROFESSIONAL_PROFILE',
      'Professional profile is invalid',
      errors,
    );
  }

  static invalidUsername(reason: string): OnboardingValidationException {
    return new OnboardingValidationException('INVALID_USERNAME', reason, [
      { code: 'INVALID_USERNAME', field: 'username', message: reason },
    ]);
  }

  static usernameAlreadyTaken(username: string): OnboardingValidationException {
    return new OnboardingValidationException(
      'USERNAME_TAKEN',
      `Username "${username}" is already taken`,
      [{ code: 'USERNAME_TAKEN', field: 'username', message: 'This username is already taken' }],
    );
  }

  static stepNotCompleted(stepId: string): OnboardingValidationException {
    return new OnboardingValidationException(
      'STEP_NOT_COMPLETED',
      `Step "${stepId}" must be completed first`,
      [{ code: 'STEP_INCOMPLETE', field: stepId, message: `Complete this step before proceeding` }],
    );
  }
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
