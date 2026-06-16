/**
 * Pure-TS wiring for the badges BC. Zero `@nestjs/*` imports — Phase 1
 * canonical shape: returns `{ useCases, routes, eventHandlers }` as a
 * `BoundedContextComposition`. The Elysia bootstrap concatenates this
 * with every other BC's composition.
 *
 * Event handlers: badges reacts to cross-BC events. They are registered
 * explicitly via `eventBus.on(...)` from the bootstrap so the BC never
 * imports `@nestjs/event-emitter`. The events themselves are published by
 * their owning BCs.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { BadgesUseCases } from './application/ports/badges.port';
import { AwardBadgeUseCase } from './application/use-cases/award-badge/award-badge.use-case';
import { HandleInterviewScheduledUseCase } from './application/use-cases/handle-interview-scheduled/handle-interview-scheduled.use-case';
import { HandlePostCreatedUseCase } from './application/use-cases/handle-post-created/handle-post-created.use-case';
import { ListManyUsersBadgesUseCase } from './application/use-cases/list-many-users-badges/list-many-users-badges.use-case';
import { ListUserBadgesUseCase } from './application/use-cases/list-user-badges/list-user-badges.use-case';
import { badgesRoutes } from './badges.routes';
import { PrismaBadgesRepository } from './infrastructure/adapters/persistence/prisma-badges.repository';

export { BadgesUseCases };

export function buildBadgesUseCases(prisma: PrismaService, logger: LoggerPort): BadgesUseCases {
  const repository = new PrismaBadgesRepository(prisma, logger);
  const awardBadge = new AwardBadgeUseCase(repository, logger);

  return {
    listUserBadges: new ListUserBadgesUseCase(repository),
    listManyUsersBadges: new ListManyUsersBadgesUseCase(repository),
    awardBadge,
    // P2-#22: HandlePostCreated takes `awardBadge` via constructor instead
    // of building it internally — wiring lives here, not in the use case.
    handlePostCreated: new HandlePostCreatedUseCase(awardBadge),
    handleInterviewScheduled: new HandleInterviewScheduledUseCase(repository, logger),
  };
}

export function buildBadgesComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<BadgesUseCases> {
  const useCases = buildBadgesUseCases(prisma, logger);

  return {
    useCases,
    routes: badgesRoutes,
    // Event handlers are intentionally empty here: the badges BC owns
    // the *use-cases* (`handlePostCreated`, etc.) but the **bindings**
    // to concrete event types live in the publishing BC's composition.
    // This keeps badges decoupled from the event class identifiers.
    eventHandlers: [],
  };
}
