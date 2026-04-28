/**
 * Social Module - ADR-001: Flat Hexagonal Architecture
 *
 * Social features: follow/unfollow, activity feeds, SSE.
 *
 * All controllers (including the activity-feed SSE stream) are
 * synthesized from framework-free Route descriptors in `*.routes.ts`.
 */

import { Module } from '@nestjs/common';
import { filter, map } from 'rxjs';
import { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusPort, LoggerPort } from '@/shared-kernel';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import { CronPort } from '@/shared-kernel/jobs/cron.port';
import {
  ActivityRoutesBundle,
  ActivitySseBundle,
  activityRoutes,
  activitySseRoutes,
} from './activity.routes';
import { registerSocialHandlers } from './application/handlers/register-handlers';
import {
  ActivityRepositoryPort,
  type ActivityType,
  type ActivityWithUser,
} from './application/ports/activity.port';
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

function makeActivitySseBundle(sseStream: SseStreamPort): ActivitySseBundle {
  return {
    subscribeToFeed: (userId) =>
      sseStream.subscribe<ActivityWithUser>(`feed:user:${userId}`).pipe(
        filter((event): event is { data: ActivityWithUser } => Boolean(event.data)),
        map(({ data: activity }) => ({
          data: activity,
          id: activity.id,
          type: 'activity',
          retry: 10000,
        })),
      ),
    subscribeToFeedByType: (userId, type: ActivityType) =>
      sseStream.subscribe<ActivityWithUser>(`feed:user:${userId}`).pipe(
        filter(
          (event): event is { data: ActivityWithUser } =>
            Boolean(event.data) && event.data.type === type,
        ),
        map(({ data: activity }) => ({
          data: activity,
          id: activity.id,
          type: 'activity',
          retry: 10000,
        })),
      ),
  };
}

@Module({
  imports: [PrismaModule, LoggerModule, EventBusModule, CacheModule],
  controllers: [
    ...synthesizeRouteControllers(FollowRoutesBundle, followRoutes),
    ...synthesizeRouteControllers(ConnectionRoutesBundle, connectionRoutes),
    ...synthesizeRouteControllers(ConnectionRecsRoutesBundle, connectionRecsRoutes),
    ...synthesizeRouteControllers(ActivityRoutesBundle, activityRoutes),
    ...synthesizeRouteControllers(ActivitySseBundle, activitySseRoutes),
    ...synthesizeRouteControllers(SkillEndorsementRoutesBundle, skillEndorsementRoutes),
    ...synthesizeRouteControllers(SkillProficiencyRoutesBundle, skillProficiencyRoutes),
  ],
  providers: [
    FollowService,
    ConnectionService,
    ActivityService,
    SkillEndorsementService,
    SkillProficiencyService,
    SkillDecayService,
    ConnectionRecsService,
    // Side-effect provider: registers the weekly skill-decay cron sweep
    // against the global CronPort at module-init time.
    {
      provide: 'SOCIAL_JOBS_REGISTERED',
      useFactory: (cron: CronPort, service: SkillDecayService, logger: LoggerPort) => {
        const worker = new SkillDecayWorker(service, logger);
        // Every Sunday 02:00 UTC — off-peak, cheap query.
        cron.register({ pattern: '0 2 * * 0' }, worker.run.bind(worker));
        return true;
      },
      inject: [CronPort, SkillDecayService, LoggerPort],
    },
    // Side-effect provider: register framework-free `@OnEvent` replacements
    // via `EventBusPort.on(...)`. The provided value is a sentinel; the
    // useful work is the registration in the factory.
    {
      provide: 'SOCIAL_HANDLERS_REGISTERED',
      useFactory: (
        eventBus: EventBusPort,
        activityService: ActivityService,
        activityCreator: ActivityCreatorPort,
        followRepo: FollowRepositoryPort,
        idempotency: IdempotencyService,
        prisma: PrismaService,
        logger: LoggerPort,
      ): boolean => {
        registerSocialHandlers({
          eventBus,
          activityService,
          activityCreator,
          followRepo,
          idempotency,
          prisma,
          logger,
        });
        return true;
      },
      inject: [
        EventBusPort,
        ActivityService,
        ActivityCreatorPort,
        FollowRepositoryPort,
        IdempotencyService,
        PrismaService,
        LoggerPort,
      ],
    },
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
    EventEmitterSocialEventBusAdapter,
    { provide: SocialEventBusPort, useExisting: EventEmitterSocialEventBusAdapter },
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
      provide: ActivitySseBundle,
      useFactory: (sseStream: SseStreamPort) => makeActivitySseBundle(sseStream),
      inject: [SseStreamPort],
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
