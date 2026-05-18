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

  /**
   * P2-#7 (event-publishing async leak): the `*Async` variants surface
   * handler errors back to the caller and await every listener. Used
   * by state-mutating use cases (resume CRUD, version snapshots,
   * version restores) where a failed audit/projection handler is a
   * regression we want the publisher to know about. Other callers
   * (telemetry-only, e.g. activity feed bumps) keep the sync methods.
   */
  abstract publishResumeCreatedAsync(
    resumeId: string,
    payload: ResumeCreatedPayload,
  ): Promise<void>;
  abstract publishResumeDeletedAsync(
    resumeId: string,
    payload: ResumeDeletedPayload,
  ): Promise<void>;
  abstract publishVersionCreatedAsync(
    resumeId: string,
    payload: VersionCreatedPayload,
  ): Promise<void>;
  abstract publishVersionRestoredAsync(
    resumeId: string,
    payload: VersionRestoredPayload,
  ): Promise<void>;
}
