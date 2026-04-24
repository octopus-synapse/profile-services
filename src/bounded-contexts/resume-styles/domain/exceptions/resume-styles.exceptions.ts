/**
 * Domain exceptions for the resume-styles context. The controller
 * layer translates these to HTTP status codes (404 / 422 / 403).
 */

export class StyleNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`ResumeStyle not found: ${id}`);
    this.name = 'StyleNotFoundError';
  }
}

export class StyleBelowAtsThresholdError extends Error {
  constructor(
    public readonly score: number,
    public readonly threshold: number,
  ) {
    super(`Style score ${score} is below the ATS-safety threshold ${threshold}`);
    this.name = 'StyleBelowAtsThresholdError';
  }
}

export class StyleScoreRegressionError extends Error {
  constructor(
    public readonly id: string,
    public readonly currentScore: number,
    public readonly attemptedScore: number,
  ) {
    super(
      `ResumeStyle ${id} styleScore is monotonic: cannot move ${currentScore} → ${attemptedScore}`,
    );
    this.name = 'StyleScoreRegressionError';
  }
}

export class StyleNotEditableError extends Error {
  constructor(public readonly id: string) {
    super(`ResumeStyle ${id} is system-managed and cannot be edited or deleted`);
    this.name = 'StyleNotEditableError';
  }
}

export class ResumeNotFoundForStyleApplyError extends Error {
  constructor(public readonly resumeId: string) {
    super(`Resume not found for style application: ${resumeId}`);
    this.name = 'ResumeNotFoundForStyleApplyError';
  }
}
