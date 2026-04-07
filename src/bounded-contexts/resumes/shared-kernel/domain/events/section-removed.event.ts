import { DomainEvent } from '@/shared-kernel';
import type { SectionKind } from '@/shared-kernel/schemas/sections';

export interface SectionRemovedPayload {
  readonly userId: string;
  readonly sectionId: string;
  readonly sectionTypeId?: string;
  readonly sectionTypeKey?: string;
  readonly sectionKind?: SectionKind;
  readonly sectionType?: string;
}

export class SectionRemovedEvent extends DomainEvent<SectionRemovedPayload> {
  static readonly TYPE = 'resume.section.removed';

  constructor(resumeId: string, payload: SectionRemovedPayload) {
    super(SectionRemovedEvent.TYPE, resumeId, payload);
  }
}
