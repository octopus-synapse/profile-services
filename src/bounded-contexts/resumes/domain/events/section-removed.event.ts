import { DomainEvent } from '@/shared-kernel';

export interface SectionRemovedPayload {
  readonly userId: string;
  readonly sectionType: string;
  readonly sectionId: string;
}

export class SectionRemovedEvent extends DomainEvent<SectionRemovedPayload> {
  static readonly TYPE = 'resume.section.removed';

  constructor(resumeId: string, payload: SectionRemovedPayload) {
    super(SectionRemovedEvent.TYPE, resumeId, payload);
  }
}
