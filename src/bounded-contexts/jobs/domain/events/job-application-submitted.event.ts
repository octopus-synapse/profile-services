import { DomainEvent } from '@/shared-kernel';

export interface JobApplicationSubmittedPayload {
  readonly userId: string;
  readonly jobId: string;
  /** The résumé the user applied with — the subject of the match snapshot. */
  readonly resumeId: string;
}

/**
 * Emitted when a user submits an internal application *with a résumé*.
 * `aggregateId` is the applicationId. The job-match BC listens and freezes
 * the Match Score onto `JobApplication.matchScoreSnapshot` (best-effort —
 * skipped when the user has no fit profile). Only emitted for applies that
 * carry a `resumeId`; external self-reported applies never fire it.
 */
export class JobApplicationSubmittedEvent extends DomainEvent<JobApplicationSubmittedPayload> {
  static readonly TYPE = 'jobs.application-submitted';
  constructor(applicationId: string, payload: JobApplicationSubmittedPayload) {
    super(JobApplicationSubmittedEvent.TYPE, applicationId, payload);
  }
}
