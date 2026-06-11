/**
 * Resume Event Publisher Adapter
 *
 * Infrastructure adapter that implements the ResumeEventPublisher port
 * using the shared EventPublisher from the shared-kernel.
 */

import { EventPublisher } from '@/shared-kernel';
import {
  ResumeCreatedEvent,
  type ResumeCreatedPayload,
  ResumeDeletedEvent,
  type ResumeDeletedPayload,
  ResumeDuplicatedEvent,
  type ResumeDuplicatedPayload,
  ResumeUpdatedEvent,
  type ResumeUpdatedPayload,
  SectionAddedEvent,
  type SectionAddedPayload,
  SectionRemovedEvent,
  type SectionRemovedPayload,
  SectionUpdatedEvent,
  type SectionUpdatedPayload,
  VersionCreatedEvent,
  type VersionCreatedPayload,
  VersionRestoredEvent,
  type VersionRestoredPayload,
} from '../../domain/events';
import { ResumeEventPublisher } from '../../domain/ports';

export class ResumeEventPublisherAdapter implements ResumeEventPublisher {
  constructor(private readonly eventPublisher: EventPublisher) {}

  publishResumeCreated(resumeId: string, payload: ResumeCreatedPayload): void {
    this.eventPublisher.publish(new ResumeCreatedEvent(resumeId, payload));
  }

  publishResumeUpdated(resumeId: string, payload: ResumeUpdatedPayload): void {
    this.eventPublisher.publish(new ResumeUpdatedEvent(resumeId, payload));
  }

  publishResumeDeleted(resumeId: string, payload: ResumeDeletedPayload): void {
    this.eventPublisher.publish(new ResumeDeletedEvent(resumeId, payload));
  }

  publishSectionAdded(resumeId: string, payload: SectionAddedPayload): void {
    this.eventPublisher.publish(new SectionAddedEvent(resumeId, payload));
  }

  publishSectionUpdated(resumeId: string, payload: SectionUpdatedPayload): void {
    this.eventPublisher.publish(new SectionUpdatedEvent(resumeId, payload));
  }

  publishSectionRemoved(resumeId: string, payload: SectionRemovedPayload): void {
    this.eventPublisher.publish(new SectionRemovedEvent(resumeId, payload));
  }

  publishVersionCreated(resumeId: string, payload: VersionCreatedPayload): void {
    this.eventPublisher.publish(new VersionCreatedEvent(resumeId, payload));
  }

  publishVersionRestored(resumeId: string, payload: VersionRestoredPayload): void {
    this.eventPublisher.publish(new VersionRestoredEvent(resumeId, payload));
  }

  publishResumeCreatedAsync(resumeId: string, payload: ResumeCreatedPayload): Promise<void> {
    return this.eventPublisher.publishAsync(new ResumeCreatedEvent(resumeId, payload));
  }

  publishResumeDeletedAsync(resumeId: string, payload: ResumeDeletedPayload): Promise<void> {
    return this.eventPublisher.publishAsync(new ResumeDeletedEvent(resumeId, payload));
  }

  publishResumeDuplicatedAsync(resumeId: string, payload: ResumeDuplicatedPayload): Promise<void> {
    return this.eventPublisher.publishAsync(new ResumeDuplicatedEvent(resumeId, payload));
  }

  publishVersionCreatedAsync(resumeId: string, payload: VersionCreatedPayload): Promise<void> {
    return this.eventPublisher.publishAsync(new VersionCreatedEvent(resumeId, payload));
  }

  publishVersionRestoredAsync(resumeId: string, payload: VersionRestoredPayload): Promise<void> {
    return this.eventPublisher.publishAsync(new VersionRestoredEvent(resumeId, payload));
  }
}
