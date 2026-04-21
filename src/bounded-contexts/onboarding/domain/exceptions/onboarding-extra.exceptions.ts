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
  readonly code: string = 'ONBOARDING_ALREADY_COMPLETED';
  constructor() {
    super('Onboarding is already completed for this user');
  }
}

export class OnboardingStepOutOfOrderException extends ValidationException {
  readonly code: string = 'ONBOARDING_STEP_OUT_OF_ORDER';
  constructor(stepId: string) {
    super(`Step "${stepId}" cannot be completed in the current order`);
  }
}

export class OnboardingSessionExpiredException extends DomainException {
  readonly code: string = 'ONBOARDING_SESSION_EXPIRED';
  readonly statusHint = 410;
  constructor() {
    super('Onboarding session has expired');
  }
}
