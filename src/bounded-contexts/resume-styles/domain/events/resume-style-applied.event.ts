import { DomainEvent } from '@/shared-kernel';

export interface ResumeStyleAppliedPayload {
  readonly resumeId: string;
  readonly styleId: string;
  readonly userId: string;
}

/**
 * Fired when a user (or admin on a user's behalf) attaches a
 * `ResumeStyle` to a `Resume`. Subscribers today: none. Future hooks:
 * `analytics/` for usage counts, `presentation/` for thumbnail
 * regeneration. `aggregateId` is the resumeId so subscribers
 * scoped to a resume can correlate without payload digging.
 */
export class ResumeStyleAppliedEvent extends DomainEvent<ResumeStyleAppliedPayload> {
  static readonly TYPE = 'resume-styles.style.applied';
  constructor(resumeId: string, payload: ResumeStyleAppliedPayload) {
    super(ResumeStyleAppliedEvent.TYPE, resumeId, payload);
  }
}
