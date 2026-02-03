import { DomainEvent } from '@/shared-kernel';

export type SectionType =
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'awards'
  | 'languages'
  | 'interests'
  | 'recommendations'
  | 'achievements'
  | 'publications'
  | 'talks'
  | 'hackathons'
  | 'bugbounties'
  | 'opensource'
  | 'projects';

export interface SectionAddedPayload {
  readonly userId: string;
  readonly sectionType: SectionType;
  readonly sectionId: string;
}

export class SectionAddedEvent extends DomainEvent<SectionAddedPayload> {
  static readonly TYPE = 'resume.section.added';

  constructor(resumeId: string, payload: SectionAddedPayload) {
    super(SectionAddedEvent.TYPE, resumeId, payload);
  }
}
