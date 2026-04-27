/**
 * Explicit registration of notifications-BC event handlers.
 *
 * Handlers are framework-free POJOs (`*.handler.ts`); this file wires
 * each one to the `EventBusPort` via `bus.on(EventClass.TYPE, ...)`.
 * Called from the BC's Nest module via a side-effect provider.
 */

import { UserFitProfileUpdatedEvent } from '@/bounded-contexts/fit-profile/domain/events';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import type { NotificationsUseCases } from '../../application/ports/notifications.port';
import { FitProfileExpiredNotificationHandler } from './fit-profile-expired.handler';
import { ResumeQualityRankNotificationHandler } from './resume-quality-rank.handler';

export interface NotificationsHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly bc: NotificationsUseCases;
  readonly logger: LoggerPort;
}

export function registerNotificationsHandlers(deps: NotificationsHandlersDeps): void {
  const { eventBus, bc, logger } = deps;

  const fitProfileExpired = new FitProfileExpiredNotificationHandler(bc, logger);
  eventBus.on(
    UserFitProfileUpdatedEvent.TYPE,
    fitProfileExpired.handle.bind(fitProfileExpired),
  );

  const qualityRank = new ResumeQualityRankNotificationHandler(bc, logger);
  eventBus.on(ResumeQualityComputedEvent.TYPE, qualityRank.handle.bind(qualityRank));
}
