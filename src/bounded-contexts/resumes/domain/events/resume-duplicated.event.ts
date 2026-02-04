import { DomainEvent } from '@/shared-kernel';

export interface ResumeDuplicatedPayload {
  readonly userId: string;
  readonly sourceResumeId: string;
  readonly newTitle: string;
}

export class ResumeDuplicatedEvent extends DomainEvent<ResumeDuplicatedPayload> {
  static readonly TYPE = 'resume.duplicated';

  constructor(newResumeId: string, payload: ResumeDuplicatedPayload) {
    super(ResumeDuplicatedEvent.TYPE, newResumeId, payload);
  }
}
