import { DomainEvent } from '@/shared-kernel';

export interface ResumeViewedPayload {
  readonly userId: string | null;
  readonly viewerIp: string;
  readonly userAgent: string;
}

export class ResumeViewedEvent extends DomainEvent<ResumeViewedPayload> {
  static readonly TYPE = 'analytics.resume.viewed';

  constructor(resumeId: string, payload: ResumeViewedPayload) {
    super(ResumeViewedEvent.TYPE, resumeId, payload);
  }
}
