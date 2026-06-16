/**
 * Domain exceptions for the resume-styles context.
 *
 * Each subclass declares `code` + `statusHint` so the global
 * `DomainExceptionFilter` can translate them to HTTP without per-controller
 * wiring.
 */
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
} from '@/shared-kernel/exceptions';

export class StyleNotFoundError extends EntityNotFoundException {
  override readonly code: string = 'STYLE_NOT_FOUND';
  constructor(id: string) {
    super('ResumeStyle', id);
  }
}

export class StyleBelowAtsThresholdError extends BusinessRuleViolationException {
  override readonly code: string = 'STYLE_BELOW_ATS_THRESHOLD';
  constructor(
    public readonly score: number,
    public readonly threshold: number,
  ) {
    super(`Style score ${score} is below the ATS-safety threshold ${threshold}`);
  }
}

export class StyleNotEditableError extends BusinessRuleViolationException {
  override readonly code: string = 'STYLE_NOT_EDITABLE';
  constructor(public readonly id: string) {
    super(`ResumeStyle ${id} is system-managed and cannot be edited or deleted`);
  }
}

export class ResumeNotFoundForStyleApplyError extends EntityNotFoundException {
  override readonly code: string = 'RESUME_NOT_FOUND_FOR_STYLE_APPLY';
  constructor(resumeId: string) {
    super('Resume', resumeId);
  }
}
