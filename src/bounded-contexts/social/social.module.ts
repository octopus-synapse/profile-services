/**
 * Social Module - ADR-001: Flat Hexagonal Architecture
 *
 * Social features: follow/unfollow, activity feeds, SSE.
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
import {
  CleanupSocialOnUserDeleteHandler,
  CreateWelcomeActivityOnUserRegisteredHandler,
  ResumeCreatedActivityHandler,
  ResumePublishedActivityHandler,
} from './application/handlers';
import { ActivityController } from './controllers/activity.controller';
import { ActivityFeedSseController } from './controllers/activity-feed-sse.controller';
import { FollowController } from './controllers/follow.controller';
import { ActivityService } from './services/activity.service';
import { FollowService } from './services/follow.service';

@Module({
  imports: [PrismaModule, LoggerModule, EventEmitterModule, EventBusModule],
  controllers: [FollowController, ActivityController, ActivityFeedSseController],
  providers: [
    FollowService,
    ActivityService,
    ResumeCreatedActivityHandler,
    ResumePublishedActivityHandler,
    CreateWelcomeActivityOnUserRegisteredHandler,
    CleanupSocialOnUserDeleteHandler,
  ],
  exports: [FollowService, ActivityService],
})
export class SocialModule {}
