import { DomainEvent } from '@/shared-kernel';
import type { SectionKind } from '@/shared-kernel/schemas/sections';

export interface SectionAddedPayload {
  readonly userId: string;
  readonly sectionId: string;
  readonly sectionTypeId?: string;
  readonly sectionTypeKey?: string;
  readonly sectionKind?: SectionKind;
  readonly sectionType?: string;
}

export class SectionAddedEvent extends DomainEvent<SectionAddedPayload> {
  static readonly TYPE = 'resume.section.added';

  constructor(resumeId: string, payload: SectionAddedPayload) {
    super(SectionAddedEvent.TYPE, resumeId, payload);
  }
}
