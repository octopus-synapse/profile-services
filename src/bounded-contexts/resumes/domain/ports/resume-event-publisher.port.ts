/**
 * Resume Event Publisher Port
 *
 * Domain interface for publishing resume-related events.
 * This port allows the domain to remain independent of infrastructure concerns.
 *
 * Implementations can be swapped for testing or different messaging systems.
 */

import type {
  ResumeCreatedPayload,
  ResumeUpdatedPayload,
  ResumeDeletedPayload,
  SectionAddedPayload,
  SectionUpdatedPayload,
  SectionRemovedPayload,
  VersionCreatedPayload,
  VersionRestoredPayload,
} from '../events';

export interface ResumeEventPublisher {
  publishResumeCreated(resumeId: string, payload: ResumeCreatedPayload): void;
  publishResumeUpdated(resumeId: string, payload: ResumeUpdatedPayload): void;
  publishResumeDeleted(resumeId: string, payload: ResumeDeletedPayload): void;
  publishSectionAdded(resumeId: string, payload: SectionAddedPayload): void;
  publishSectionUpdated(resumeId: string, payload: SectionUpdatedPayload): void;
  publishSectionRemoved(resumeId: string, payload: SectionRemovedPayload): void;
  publishVersionCreated(resumeId: string, payload: VersionCreatedPayload): void;
  publishVersionRestored(
    resumeId: string,
    payload: VersionRestoredPayload,
  ): void;
}

export const RESUME_EVENT_PUBLISHER = Symbol('RESUME_EVENT_PUBLISHER');
