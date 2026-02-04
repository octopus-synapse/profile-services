/**
 * Resume Event Publisher Adapter
 *
 * Infrastructure adapter that implements the ResumeEventPublisher port
 * using the shared EventPublisher from the shared-kernel.
 */

import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@/shared-kernel';
import type { ResumeEventPublisher } from '../../domain/ports';
import {
  ResumeCreatedEvent,
  ResumeUpdatedEvent,
  ResumeDeletedEvent,
  SectionAddedEvent,
  SectionUpdatedEvent,
  SectionRemovedEvent,
  VersionCreatedEvent,
  VersionRestoredEvent,
  type ResumeCreatedPayload,
  type ResumeUpdatedPayload,
  type ResumeDeletedPayload,
  type SectionAddedPayload,
  type SectionUpdatedPayload,
  type SectionRemovedPayload,
  type VersionCreatedPayload,
  type VersionRestoredPayload,
} from '../../domain/events';

@Injectable()
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

  publishSectionUpdated(
    resumeId: string,
    payload: SectionUpdatedPayload,
  ): void {
    this.eventPublisher.publish(new SectionUpdatedEvent(resumeId, payload));
  }

  publishSectionRemoved(
    resumeId: string,
    payload: SectionRemovedPayload,
  ): void {
    this.eventPublisher.publish(new SectionRemovedEvent(resumeId, payload));
  }

  publishVersionCreated(
    resumeId: string,
    payload: VersionCreatedPayload,
  ): void {
    this.eventPublisher.publish(new VersionCreatedEvent(resumeId, payload));
  }

  publishVersionRestored(
    resumeId: string,
    payload: VersionRestoredPayload,
  ): void {
    this.eventPublisher.publish(new VersionRestoredEvent(resumeId, payload));
  }
}
