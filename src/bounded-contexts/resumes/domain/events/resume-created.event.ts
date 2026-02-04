import { DomainEvent } from '@/shared-kernel';

export interface ResumeCreatedPayload {
  readonly userId: string;
  readonly title: string;
}

export class ResumeCreatedEvent extends DomainEvent<ResumeCreatedPayload> {
  static readonly TYPE = 'resume.created';

  constructor(resumeId: string, payload: ResumeCreatedPayload) {
    super(ResumeCreatedEvent.TYPE, resumeId, payload);
  }
}
