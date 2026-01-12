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
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { FollowService } from './services/follow.service';
import { ActivityService } from './services/activity.service';

// Controllers
import { FollowController } from './controllers/follow.controller';
import { ActivityController } from './controllers/activity.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FollowController, ActivityController],
  providers: [FollowService, ActivityService],
  exports: [FollowService, ActivityService],
})
export class SocialModule {}
