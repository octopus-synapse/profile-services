import { DomainEvent } from '@/shared-kernel';

export interface JobFitProfileUpdatedPayload {
  readonly editedByUserId: string;
}

/**
 * Emitted when a recruiter writes (create or replace) a `JobFitProfile`
 * slider set. `aggregateId` is the jobId — every Match Score cached
 * against this job needs to drop because the Role Match axis just moved.
 */
export class JobFitProfileUpdatedEvent extends DomainEvent<JobFitProfileUpdatedPayload> {
  static readonly TYPE = 'fit-profile.job-updated';
  constructor(jobId: string, payload: JobFitProfileUpdatedPayload) {
    super(JobFitProfileUpdatedEvent.TYPE, jobId, payload);
  }
}
