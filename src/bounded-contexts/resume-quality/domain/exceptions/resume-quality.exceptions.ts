import {
  ConflictException,
  DomainException,
  UnauthorizedException,
} from '@/shared-kernel/exceptions';

/** GET /v1/resume-quality/snapshot returned no row — caller must POST recompute first. */
export class ResumeQualitySnapshotMissingException extends DomainException {
  readonly code: string = 'RESUME_QUALITY_SNAPSHOT_MISSING';
  readonly statusHint = 404;
  constructor() {
    super('No quality snapshot yet — POST /recompute first');
  }
}

/** Guard ran without an authenticated user populated on the request. */
export class ResumeQualityAuthenticatedUserMissingException extends UnauthorizedException {
  readonly code: string = 'RESUME_QUALITY_AUTHENTICATED_USER_MISSING';
  constructor() {
    super('Authenticated user not present on request');
  }
}

/** Resume quality score is below the threshold required for the action. */
export class ResumeQualityBelowThresholdException extends ConflictException {
  readonly code: string = 'RESUME_QUALITY_BELOW_THRESHOLD';
  constructor(
    public readonly score: number,
    public readonly threshold: number,
  ) {
    super(`Resume quality score (${score}) is below the required threshold (${threshold}).`);
  }
}

/** Resume quality has not been computed yet — the action requires a score. */
export class ResumeQualityScoreUnavailableException extends ConflictException {
  readonly code: string = 'RESUME_QUALITY_SCORE_UNAVAILABLE';
  constructor() {
    super('Resume quality has not been computed yet. Trigger a recompute first.');
  }
}
