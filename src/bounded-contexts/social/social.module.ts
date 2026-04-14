/**
 * Social Module - ADR-001: Flat Hexagonal Architecture
 *
 * Social features: follow/unfollow, activity feeds, SSE.
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import {
  CleanupSocialOnUserDeleteHandler,
  CreateWelcomeActivityOnUserRegisteredHandler,
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
import { SOCIAL_EVENT_BUS_PORT } from './application/ports/social-event-bus.port';
import { SOCIAL_LOGGER_PORT } from './application/ports/social-logger.port';
import { ActivityController } from './controllers/activity.controller';
import { ActivityFeedSseController } from './controllers/activity-feed-sse.controller';
import { ConnectionController } from './controllers/connection.controller';
import { FollowController } from './controllers/follow.controller';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppLoggerSocialAdapter } from './infrastructure/adapters/app-logger.adapter';
import { EventEmitterSocialEventBusAdapter } from './infrastructure/adapters/event-emitter-social-event-bus.adapter';
import { ActivityRepository } from './infrastructure/adapters/persistence/activity.repository';
import { ConnectionRepository } from './infrastructure/adapters/persistence/connection.repository';
import { FollowRepository } from './infrastructure/adapters/persistence/follow.repository';
import { ActivityService } from './services/activity.service';
import { ConnectionService } from './services/connection.service';
import { FollowService } from './services/follow.service';

@Module({
  imports: [PrismaModule, LoggerModule, EventEmitterModule, EventBusModule],
  controllers: [
    FollowController,
    ConnectionController,
    ActivityController,
    ActivityFeedSseController,
  ],
  providers: [
    FollowService,
    ConnectionService,
    ActivityService,
    ResumeCreatedActivityHandler,
    ResumePublishedActivityHandler,
    CreateWelcomeActivityOnUserRegisteredHandler,
    CleanupSocialOnUserDeleteHandler,
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
    // Logger + event bus ports
    {
      provide: SOCIAL_LOGGER_PORT,
      useFactory: (logger: AppLoggerService) => new AppLoggerSocialAdapter(logger),
      inject: [AppLoggerService],
    },
    {
      provide: SOCIAL_EVENT_BUS_PORT,
      useFactory: (emitter: EventEmitter2) => new EventEmitterSocialEventBusAdapter(emitter),
      inject: [EventEmitter2],
    },
    // Facade ports (services extend/implement these)
    { provide: FollowReaderPort, useExisting: FollowService },
    { provide: ActivityReaderPort, useExisting: ActivityService },
    { provide: ActivityCreatorPort, useExisting: ActivityService },
    { provide: ActivityLoggerPort, useExisting: ActivityService },
    { provide: ConnectionReaderPort, useExisting: ConnectionService },
  ],
  exports: [FollowService, ConnectionService, ActivityService],
})
export class SocialModule {}
