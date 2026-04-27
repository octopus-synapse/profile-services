/**
 * Badges Module
 *
 * ADR-001: 6 POJO use cases (list-user, list-many-users, award, plus
 * three trigger handlers) sit on top of `BadgesRepositoryPort`. The
 * Prisma adapter absorbs the unique-constraint collision so awards
 * stay idempotent.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { AwardBadgeUseCase } from './application/use-cases/award-badge/award-badge.use-case';
import { HandleAtsScoreCalculatedUseCase } from './application/use-cases/handle-ats-score-calculated/handle-ats-score-calculated.use-case';
import { HandleInterviewScheduledUseCase } from './application/use-cases/handle-interview-scheduled/handle-interview-scheduled.use-case';
import { HandlePostCreatedUseCase } from './application/use-cases/handle-post-created/handle-post-created.use-case';
import { ListManyUsersBadgesUseCase } from './application/use-cases/list-many-users-badges/list-many-users-badges.use-case';
import { ListUserBadgesUseCase } from './application/use-cases/list-user-badges/list-user-badges.use-case';
import { BadgesRepositoryPort } from './domain/ports/badges.repository.port';
import { PrismaBadgesRepository } from './infrastructure/adapters/persistence/prisma-badges.repository';
import { BadgeController } from './infrastructure/controllers/badge.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BadgeController],
  providers: [
    {
      provide: BadgesRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaBadgesRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: ListUserBadgesUseCase,
      useFactory: (repo: BadgesRepositoryPort) => new ListUserBadgesUseCase(repo),
      inject: [BadgesRepositoryPort],
    },
    {
      provide: ListManyUsersBadgesUseCase,
      useFactory: (repo: BadgesRepositoryPort) => new ListManyUsersBadgesUseCase(repo),
      inject: [BadgesRepositoryPort],
    },
    {
      provide: AwardBadgeUseCase,
      useFactory: (repo: BadgesRepositoryPort, logger: LoggerPort) =>
        new AwardBadgeUseCase(repo, logger),
      inject: [BadgesRepositoryPort, LoggerPort],
    },
    {
      provide: HandlePostCreatedUseCase,
      useFactory: (repo: BadgesRepositoryPort, logger: LoggerPort) =>
        new HandlePostCreatedUseCase(repo, logger),
      inject: [BadgesRepositoryPort, LoggerPort],
    },
    {
      provide: HandleAtsScoreCalculatedUseCase,
      useFactory: (repo: BadgesRepositoryPort, logger: LoggerPort) =>
        new HandleAtsScoreCalculatedUseCase(repo, logger),
      inject: [BadgesRepositoryPort, LoggerPort],
    },
    {
      provide: HandleInterviewScheduledUseCase,
      useFactory: (repo: BadgesRepositoryPort, logger: LoggerPort) =>
        new HandleInterviewScheduledUseCase(repo, logger),
      inject: [BadgesRepositoryPort, LoggerPort],
    },
  ],
  exports: [
    ListUserBadgesUseCase,
    ListManyUsersBadgesUseCase,
    AwardBadgeUseCase,
    HandlePostCreatedUseCase,
    HandleAtsScoreCalculatedUseCase,
    HandleInterviewScheduledUseCase,
  ],
})
export class BadgesModule {}
