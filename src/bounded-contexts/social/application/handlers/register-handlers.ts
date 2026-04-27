/**
 * Explicit registration of social-BC event handlers.
 *
 * Handlers are framework-free POJOs (`*.handler.ts`); this file wires
 * each one to the `EventBusPort` via `bus.on(EventClass.TYPE, ...)`.
 * Called from the BC's Nest module via a side-effect provider.
 */

import type { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes';
import { ResumePublishedEvent } from '@/bounded-contexts/presentation';
import { UserDeletedEvent, UserRegisteredEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import { ConnectionAcceptedEvent } from '../../domain/events';
import type { ActivityService } from '../../services/activity.service';
import type { ActivityCreatorPort } from '../ports/facade.ports';
import type { FollowRepositoryPort } from '../ports/follow.port';
import { CleanupSocialOnUserDeleteHandler } from './cleanup-social-on-user-delete.handler';
import { CreateWelcomeActivityOnUserRegisteredHandler } from './create-welcome-activity-on-user-registered.handler';
import { MutualFollowOnConnectionAcceptedHandler } from './mutual-follow-on-connection-accepted.handler';
import { ResumeCreatedActivityHandler } from './resume-created-activity.handler';
import { ResumePublishedActivityHandler } from './resume-published-activity.handler';

export interface SocialHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly activityService: ActivityService;
  readonly activityCreator: ActivityCreatorPort;
  readonly followRepo: FollowRepositoryPort;
  readonly idempotency: IdempotencyService;
  readonly prisma: PrismaService;
  readonly logger: LoggerPort;
}

export function registerSocialHandlers(deps: SocialHandlersDeps): void {
  const { eventBus, activityService, activityCreator, followRepo, idempotency, prisma, logger } =
    deps;

  const resumeCreated = new ResumeCreatedActivityHandler(activityCreator, idempotency, logger);
  eventBus.on(ResumeCreatedEvent.TYPE, resumeCreated.handle.bind(resumeCreated));

  const resumePublished = new ResumePublishedActivityHandler(activityService, logger);
  eventBus.on(ResumePublishedEvent.TYPE, resumePublished.handle.bind(resumePublished));

  const welcome = new CreateWelcomeActivityOnUserRegisteredHandler(
    activityService,
    idempotency,
    logger,
  );
  eventBus.on(UserRegisteredEvent.TYPE, welcome.handle.bind(welcome));

  const cleanup = new CleanupSocialOnUserDeleteHandler(prisma, logger);
  eventBus.on(UserDeletedEvent.TYPE, cleanup.handle.bind(cleanup));

  const mutualFollow = new MutualFollowOnConnectionAcceptedHandler(followRepo, idempotency, logger);
  eventBus.on(ConnectionAcceptedEvent.TYPE, mutualFollow.handle.bind(mutualFollow));
}
