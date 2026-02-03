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
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';

// Services
import { FollowService } from './services/follow.service';
import { ActivityService } from './services/activity.service';

// Controllers
import { FollowController } from './controllers/follow.controller';
import { ActivityController } from './controllers/activity.controller';
import { ActivityFeedSseController } from './controllers/activity-feed-sse.controller';

// Event Handlers
import {
  ResumeCreatedActivityHandler,
  ResumePublishedActivityHandler,
  CreateWelcomeActivityOnUserRegisteredHandler,
  CleanupSocialOnUserDeleteHandler,
} from '../application/handlers';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [
    FollowController,
    ActivityController,
    ActivityFeedSseController,
  ],
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
