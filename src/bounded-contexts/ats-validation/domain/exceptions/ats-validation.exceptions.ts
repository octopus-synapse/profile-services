/**
 * ATS Validation Bounded Context Exceptions
 */
import {
  DomainException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class AtsRuleSetNotFoundException extends DomainException {
  readonly code: string = 'ATS_RULE_SET_NOT_FOUND';
  readonly statusHint = 404;
  constructor(id: string) {
    super(`ATS rule set ${id} not found`);
  }
}

export class AtsRuleInvalidException extends ValidationException {
  readonly code: string = 'ATS_RULE_INVALID';
  constructor(reason: string) {
    super(`ATS rule is invalid: ${reason}`);
  }
}

export class AtsValidationUnavailableException extends DomainException {
  readonly code: string = 'ATS_VALIDATION_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('ATS validation is temporarily unavailable');
  }
}

export class ResumeAccessDeniedException extends ForbiddenException {
  readonly code: string = 'ATS_RESUME_ACCESS_DENIED';
  constructor() {
    super('You do not have access to this resume');
  }
}
