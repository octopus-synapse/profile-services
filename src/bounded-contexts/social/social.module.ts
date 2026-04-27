/**
 * Social Module - ADR-001: Flat Hexagonal Architecture
 *
 * Social features: follow/unfollow, activity feeds, SSE.
 *
 * Most controllers have been migrated to framework-free Route
 * descriptors (see `*.routes.ts`). The SSE controller stays as a
 * legacy Nest controller because the Route synthesizer doesn't model
 * SSE yet.
 */

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { ActivityRoutesBundle, activityRoutes } from './activity.routes';
import {
  CleanupSocialOnUserDeleteHandler,
  CreateWelcomeActivityOnUserRegisteredHandler,
  MutualFollowOnConnectionAcceptedHandler,
  ResumeCreatedActivityHandler,
  ResumePublishedActivityHandler,
} from './application/handlers';
import { ActivityRepositoryPort } from './application/ports/activity.port';
import { ConnectionRepositoryPort } from './application/ports/connection.port';
import {
  ActivityCreatorPort,
  ActivityLoggerPort,
  ActivityReaderPort,
  ConnectionReaderPort,
  FollowReaderPort,
} from './application/ports/facade.ports';
import { FollowRepositoryPort } from './application/ports/follow.port';
import { SocialEventBusPort } from './application/ports/social-event-bus.port';
import { ConnectionRoutesBundle, connectionRoutes } from './connection.routes';
import { ConnectionRecsRoutesBundle, connectionRecsRoutes } from './connection-recs.routes';
import { ActivityFeedSseController } from './controllers/activity-feed-sse.controller';
import { FollowRoutesBundle, followRoutes } from './follow.routes';
import { EventEmitterSocialEventBusAdapter } from './infrastructure/adapters/event-emitter-social-event-bus.adapter';
import { ActivityRepository } from './infrastructure/adapters/persistence/activity.repository';
import { ConnectionRepository } from './infrastructure/adapters/persistence/connection.repository';
import { FollowRepository } from './infrastructure/adapters/persistence/follow.repository';
import { ActivityService } from './services/activity.service';
import { ConnectionService } from './services/connection.service';
import { ConnectionRecsService } from './services/connection-recs.service';
import { FollowService } from './services/follow.service';
import { SkillDecayService } from './services/skill-decay.service';
import { SkillDecayWorker } from './services/skill-decay.worker';
import { SkillEndorsementService } from './services/skill-endorsement.service';
import { SkillProficiencyService } from './services/skill-proficiency.service';
import { SkillEndorsementRoutesBundle, skillEndorsementRoutes } from './skill-endorsement.routes';
import { SkillProficiencyRoutesBundle, skillProficiencyRoutes } from './skill-proficiency.routes';

@Module({
  imports: [PrismaModule, LoggerModule, EventEmitterModule, EventBusModule, CacheModule],
  controllers: [
    ...synthesizeRouteControllers(FollowRoutesBundle, followRoutes),
    ...synthesizeRouteControllers(ConnectionRoutesBundle, connectionRoutes),
    ...synthesizeRouteControllers(ConnectionRecsRoutesBundle, connectionRecsRoutes),
    ...synthesizeRouteControllers(ActivityRoutesBundle, activityRoutes),
    ...synthesizeRouteControllers(SkillEndorsementRoutesBundle, skillEndorsementRoutes),
    ...synthesizeRouteControllers(SkillProficiencyRoutesBundle, skillProficiencyRoutes),
    ActivityFeedSseController,
  ],
  providers: [
    FollowService,
    ConnectionService,
    ActivityService,
    SkillEndorsementService,
    SkillProficiencyService,
    SkillDecayService,
    SkillDecayWorker,
    ConnectionRecsService,
    ResumeCreatedActivityHandler,
    ResumePublishedActivityHandler,
    CreateWelcomeActivityOnUserRegisteredHandler,
    CleanupSocialOnUserDeleteHandler,
    MutualFollowOnConnectionAcceptedHandler,
    // Repository port bindings
    {
      provide: FollowRepositoryPort,
      useFactory: (prisma: PrismaService) => new FollowRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ActivityRepositoryPort,
      useFactory: (prisma: PrismaService) => new ActivityRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ConnectionRepositoryPort,
      useFactory: (prisma: PrismaService) => new ConnectionRepository(prisma),
      inject: [PrismaService],
    },
    // Event bus port (LoggerPort is provided globally by LoggerModule)
    {
      provide: SocialEventBusPort,
      useFactory: (emitter: EventEmitter2) => new EventEmitterSocialEventBusAdapter(emitter),
      inject: [EventEmitter2],
    },
    // Facade ports (services extend/implement these)
    { provide: FollowReaderPort, useExisting: FollowService },
    { provide: ActivityReaderPort, useExisting: ActivityService },
    { provide: ActivityCreatorPort, useExisting: ActivityService },
    { provide: ActivityLoggerPort, useExisting: ActivityService },
    { provide: ConnectionReaderPort, useExisting: ConnectionService },
    // Route bundle providers — wrap the underlying services so the
    // synthesized controllers can resolve a single DI token per bundle.
    {
      provide: FollowRoutesBundle,
      useFactory: (
        follow: FollowReaderPort,
        activity: ActivityLoggerPort,
        connection: ConnectionReaderPort,
      ): FollowRoutesBundle => ({
        followService: follow,
        activityService: activity,
        connectionService: connection,
      }),
      inject: [FollowReaderPort, ActivityLoggerPort, ConnectionReaderPort],
    },
    {
      provide: ConnectionRoutesBundle,
      useFactory: (
        connection: ConnectionService,
        follow: FollowService,
      ): ConnectionRoutesBundle => ({
        connectionService: connection,
        followService: follow,
      }),
      inject: [ConnectionService, FollowService],
    },
    {
      provide: ConnectionRecsRoutesBundle,
      useFactory: (service: ConnectionRecsService): ConnectionRecsRoutesBundle => ({ service }),
      inject: [ConnectionRecsService],
    },
    {
      provide: ActivityRoutesBundle,
      useFactory: (activity: ActivityReaderPort): ActivityRoutesBundle => ({
        activityService: activity,
      }),
      inject: [ActivityReaderPort],
    },
    {
      provide: SkillEndorsementRoutesBundle,
      useFactory: (service: SkillEndorsementService): SkillEndorsementRoutesBundle => ({ service }),
      inject: [SkillEndorsementService],
    },
    {
      provide: SkillProficiencyRoutesBundle,
      useFactory: (service: SkillProficiencyService): SkillProficiencyRoutesBundle => ({ service }),
      inject: [SkillProficiencyService],
    },
  ],
  exports: [FollowService, ConnectionService, ActivityService],
})
export class SocialModule {}
