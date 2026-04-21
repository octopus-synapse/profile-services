/**
 * Automation Bounded Context Exceptions
 *
 * Covers rage-apply and auto-apply workers.
 */
import {
  ConflictException,
  DomainException,
  ForbiddenException,
  LimitExceededException,
  ValidationException,
} from '@/shared-kernel/exceptions';

export class AutoApplyAlreadyRunningException extends ConflictException {
  readonly code: string = 'AUTO_APPLY_ALREADY_RUNNING';
  constructor() {
    super('An auto-apply job is already running for this user');
  }
}

export class RageApplyLimitReachedException extends LimitExceededException {
  readonly code: string = 'RAGE_APPLY_LIMIT_REACHED';
  constructor(max: number) {
    super('rage_apply_daily', max, max);
  }
}

export class RageApplyMinFitInvalidException extends ValidationException {
  readonly code: string = 'RAGE_APPLY_MIN_FIT_INVALID';
  constructor() {
    super('minFit must be between 0 and 100');
  }
}

export class AutomationWorkerUnavailableException extends DomainException {
  readonly code: string = 'AUTOMATION_WORKER_UNAVAILABLE';
  readonly statusHint = 503;
  constructor() {
    super('Automation workers are temporarily unavailable');
  }
}

export class AutomationItemNotOwnedException extends ForbiddenException {
  readonly code: string = 'AUTOMATION_ITEM_NOT_OWNED';
  constructor() {
    super('You do not own this item');
  }
}
