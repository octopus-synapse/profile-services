import { DomainEvent } from '@/shared-kernel';

export interface ResumeUpdatedPayload {
  readonly userId: string;
  readonly changedFields: readonly string[];
}

export class ResumeUpdatedEvent extends DomainEvent<ResumeUpdatedPayload> {
  static readonly TYPE = 'resume.updated';

  constructor(resumeId: string, payload: ResumeUpdatedPayload) {
    super(ResumeUpdatedEvent.TYPE, resumeId, payload);
  }
}
