import { DomainEvent } from '@/shared-kernel';

export interface ResumePublishedPayload {
  readonly userId: string;
  readonly slug: string;
}

export class ResumePublishedEvent extends DomainEvent<ResumePublishedPayload> {
  static readonly TYPE = 'presentation.resume.published';

  constructor(resumeId: string, payload: ResumePublishedPayload) {
    super(ResumePublishedEvent.TYPE, resumeId, payload);
  }
}
