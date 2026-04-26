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
  readonly code: string = 'STYLE_NOT_FOUND';
  constructor(id: string) {
    super('ResumeStyle', id);
  }
}

export class StyleBelowAtsThresholdError extends BusinessRuleViolationException {
  readonly code: string = 'STYLE_BELOW_ATS_THRESHOLD';
  constructor(
    public readonly score: number,
    public readonly threshold: number,
  ) {
    super(`Style score ${score} is below the ATS-safety threshold ${threshold}`);
  }
}

export class StyleScoreRegressionError extends BusinessRuleViolationException {
  readonly code: string = 'STYLE_SCORE_REGRESSION';
  constructor(
    public readonly id: string,
    public readonly currentScore: number,
    public readonly attemptedScore: number,
  ) {
    super(
      `ResumeStyle ${id} styleScore is monotonic: cannot move ${currentScore} → ${attemptedScore}`,
    );
  }
}

export class StyleNotEditableError extends BusinessRuleViolationException {
  readonly code: string = 'STYLE_NOT_EDITABLE';
  constructor(public readonly id: string) {
    super(`ResumeStyle ${id} is system-managed and cannot be edited or deleted`);
  }
}

export class ResumeNotFoundForStyleApplyError extends EntityNotFoundException {
  readonly code: string = 'RESUME_NOT_FOUND_FOR_STYLE_APPLY';
  constructor(resumeId: string) {
    super('Resume', resumeId);
  }
}
