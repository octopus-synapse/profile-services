import { DomainEvent } from '@/shared-kernel';
import type { SectionKind } from '@/shared-kernel/schemas/sections';

export interface SectionUpdatedPayload {
  readonly userId: string;
  readonly sectionId: string;
  readonly sectionTypeId?: string;
  readonly sectionTypeKey?: string;
  readonly sectionKind?: SectionKind;
  readonly sectionType?: string;
  readonly operation: 'updated';
}

export class SectionUpdatedEvent extends DomainEvent<SectionUpdatedPayload> {
  static readonly TYPE = 'resume.section.updated';

  constructor(resumeId: string, payload: SectionUpdatedPayload) {
    super(SectionUpdatedEvent.TYPE, resumeId, payload);
  }
}
