/**
 * Explicit registration of resume-analytics-BC event handlers.
 *
 * Handlers are framework-free POJOs (`*.handler.ts`); this file wires
 * each one to the `EventBusPort` via `bus.on(EventClass.TYPE, ...)`.
 * Called from the BC's Nest module via a side-effect provider.
 */

import { UserRegisteredEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import type { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import {
  ResumeCreatedEvent,
  ResumeDeletedEvent,
  ResumeUpdatedEvent,
  SectionAddedEvent,
  SectionRemovedEvent,
  SectionUpdatedEvent,
} from '@/bounded-contexts/resumes';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import type { AnalyticsProjectionPort } from '../ports/analytics-projection.port';
import { InitializeAnalyticsOnUserRegisteredHandler } from './initialize-analytics-on-user-registered.handler';
import { type AnalyticsRecorder, ResumeCreatedHandler } from './resume-created.handler';
import { ResumeUpdatedHandler, type ViewTracker } from './resume-updated.handler';
import { SyncProjectionOnResumeCreatedHandler } from './sync-projection-on-resume-created.handler';
import { SyncProjectionOnResumeDeletedHandler } from './sync-projection-on-resume-deleted.handler';
import { SyncProjectionOnSectionAddedHandler } from './sync-projection-on-section-added.handler';
import { SyncProjectionOnSectionRemovedHandler } from './sync-projection-on-section-removed.handler';
import { SyncProjectionOnSectionUpdatedHandler } from './sync-projection-on-section-updated.handler';

export interface ResumeAnalyticsHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly recorder: AnalyticsRecorder;
  readonly tracker: ViewTracker;
  readonly projection: AnalyticsProjectionPort;
  readonly idempotency: IdempotencyService;
  readonly logger: LoggerPort;
}

export function registerResumeAnalyticsHandlers(deps: ResumeAnalyticsHandlersDeps): void {
  const { eventBus, recorder, tracker, projection, idempotency, logger } = deps;

  const init = new InitializeAnalyticsOnUserRegisteredHandler(logger);
  eventBus.on(UserRegisteredEvent.TYPE, (e: UserRegisteredEvent) => init.handle(e));

  const created = new ResumeCreatedHandler(recorder, idempotency, logger);
  eventBus.on(ResumeCreatedEvent.TYPE, created.handle.bind(created));

  const updated = new ResumeUpdatedHandler(tracker, logger);
  eventBus.on(ResumeUpdatedEvent.TYPE, updated.handle.bind(updated));

  const projCreated = new SyncProjectionOnResumeCreatedHandler(projection, logger);
  eventBus.on(ResumeCreatedEvent.TYPE, projCreated.handle.bind(projCreated));

  const projDeleted = new SyncProjectionOnResumeDeletedHandler(projection, logger);
  eventBus.on(ResumeDeletedEvent.TYPE, projDeleted.handle.bind(projDeleted));

  const sectionAdded = new SyncProjectionOnSectionAddedHandler(projection, logger);
  eventBus.on(SectionAddedEvent.TYPE, sectionAdded.handle.bind(sectionAdded));

  const sectionUpdated = new SyncProjectionOnSectionUpdatedHandler(projection, logger);
  eventBus.on(SectionUpdatedEvent.TYPE, sectionUpdated.handle.bind(sectionUpdated));

  const sectionRemoved = new SyncProjectionOnSectionRemovedHandler(projection, logger);
  eventBus.on(SectionRemovedEvent.TYPE, sectionRemoved.handle.bind(sectionRemoved));
}
