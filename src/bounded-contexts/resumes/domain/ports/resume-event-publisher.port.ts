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
  ResumeDeletedPayload,
  ResumeUpdatedPayload,
  SectionAddedPayload,
  SectionRemovedPayload,
  SectionUpdatedPayload,
  VersionCreatedPayload,
  VersionRestoredPayload,
} from '../events';

export abstract class ResumeEventPublisher {
  abstract publishResumeCreated(resumeId: string, payload: ResumeCreatedPayload): void;
  abstract publishResumeUpdated(resumeId: string, payload: ResumeUpdatedPayload): void;
  abstract publishResumeDeleted(resumeId: string, payload: ResumeDeletedPayload): void;
  abstract publishSectionAdded(resumeId: string, payload: SectionAddedPayload): void;
  abstract publishSectionUpdated(resumeId: string, payload: SectionUpdatedPayload): void;
  abstract publishSectionRemoved(resumeId: string, payload: SectionRemovedPayload): void;
  abstract publishVersionCreated(resumeId: string, payload: VersionCreatedPayload): void;
  abstract publishVersionRestored(resumeId: string, payload: VersionRestoredPayload): void;
}
