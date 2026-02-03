import { DomainEvent } from '@/shared-kernel';

export interface SectionUpdatedPayload {
  readonly userId: string;
  readonly sectionType: string;
  readonly sectionId: string;
  readonly operation: 'updated';
}

export class SectionUpdatedEvent extends DomainEvent<SectionUpdatedPayload> {
  static readonly TYPE = 'resume.section.updated';

  constructor(resumeId: string, payload: SectionUpdatedPayload) {
    super(SectionUpdatedEvent.TYPE, resumeId, payload);
  }
}
