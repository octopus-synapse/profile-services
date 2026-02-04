import { DomainEvent } from '@/shared-kernel';

export interface ResumeDeletedPayload {
  readonly userId: string;
}

export class ResumeDeletedEvent extends DomainEvent<ResumeDeletedPayload> {
  static readonly TYPE = 'resume.deleted';

  constructor(resumeId: string, payload: ResumeDeletedPayload) {
    super(ResumeDeletedEvent.TYPE, resumeId, payload);
  }
}
