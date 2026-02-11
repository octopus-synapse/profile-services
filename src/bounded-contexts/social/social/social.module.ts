/**
 * Social Module
 *
 * Provides social features for the profile service:
 * - Follow/unfollow system
 * - Activity feeds
 * - Social networking capabilities
 *
 * Decision: This module is designed to be composable and
 * can be imported into other modules that need social features.
 *
 * Event Handlers:
 * - ResumeCreatedActivityHandler: Creates activity when resume is created
 * - ResumePublishedActivityHandler: Creates activity when resume is published
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';
// Event Handlers
import {
  CleanupSocialOnUserDeleteHandler,
  CreateWelcomeActivityOnUserRegisteredHandler,
  ResumeCreatedActivityHandler,
  ResumePublishedActivityHandler,
} from '../application/handlers';
import { ActivityController } from './controllers/activity.controller';
import { ActivityFeedSseController } from './controllers/activity-feed-sse.controller';
// Controllers
import { FollowController } from './controllers/follow.controller';
import { ActivityService } from './services/activity.service';
// Services
import { FollowService } from './services/follow.service';

@Module({
  imports: [PrismaModule, LoggerModule, EventEmitterModule, EventBusModule],
  controllers: [FollowController, ActivityController, ActivityFeedSseController],
  providers: [
    // Domain Services
    FollowService,
    ActivityService,
    // Event Handlers
    ResumeCreatedActivityHandler,
    ResumePublishedActivityHandler,
    CreateWelcomeActivityOnUserRegisteredHandler,
    CleanupSocialOnUserDeleteHandler,
  ],
  exports: [FollowService, ActivityService],
})
export class SocialModule {}
