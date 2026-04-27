/**
 * Pure-TS wiring for the badges BC. Zero `@nestjs/*` imports — the
 * Nest module is a thin shell that exposes the result of this
 * function as a single provider. See ADR on framework substitution.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { BadgesUseCases } from './application/ports/badges.port';
import { AwardBadgeUseCase } from './application/use-cases/award-badge/award-badge.use-case';
import { HandleAtsScoreCalculatedUseCase } from './application/use-cases/handle-ats-score-calculated/handle-ats-score-calculated.use-case';
import { HandleInterviewScheduledUseCase } from './application/use-cases/handle-interview-scheduled/handle-interview-scheduled.use-case';
import { HandlePostCreatedUseCase } from './application/use-cases/handle-post-created/handle-post-created.use-case';
import { ListManyUsersBadgesUseCase } from './application/use-cases/list-many-users-badges/list-many-users-badges.use-case';
import { ListUserBadgesUseCase } from './application/use-cases/list-user-badges/list-user-badges.use-case';
import { PrismaBadgesRepository } from './infrastructure/adapters/persistence/prisma-badges.repository';

export { BadgesUseCases };

export function buildBadgesUseCases(prisma: PrismaService, logger: LoggerPort): BadgesUseCases {
  const repository = new PrismaBadgesRepository(prisma, logger);

  return {
    listUserBadges: new ListUserBadgesUseCase(repository),
    listManyUsersBadges: new ListManyUsersBadgesUseCase(repository),
    awardBadge: new AwardBadgeUseCase(repository, logger),
    handlePostCreated: new HandlePostCreatedUseCase(repository, logger),
    handleAtsScoreCalculated: new HandleAtsScoreCalculatedUseCase(repository, logger),
    handleInterviewScheduled: new HandleInterviewScheduledUseCase(repository, logger),
  };
}
