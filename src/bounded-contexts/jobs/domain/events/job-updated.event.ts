import { DomainEvent } from '@/shared-kernel';

export interface JobUpdatedPayload {
  readonly editedByUserId: string;
  /** Which axes of the job moved. Downstream consumers can use this to
   * skip invalidation when only cosmetic fields changed (title / display
   * only), though in the MVP every listed field invalidates the Match
   * cache — they all feed a sub-score. */
  readonly changedFields: readonly string[];
}

/**
 * Emitted when a job's description / requirements / skills mutate.
 * `aggregateId` is the jobId. The Match Score cache keys include the
 * jobId so every match cached against this job drops when the event
 * fires — see `JobMatchRecomputeWorker.onJobUpdated`.
 */
export class JobUpdatedEvent extends DomainEvent<JobUpdatedPayload> {
  static readonly TYPE = 'jobs.updated';
  constructor(jobId: string, payload: JobUpdatedPayload) {
    super(JobUpdatedEvent.TYPE, jobId, payload);
  }
}
