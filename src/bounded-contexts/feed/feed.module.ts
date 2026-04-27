/**
 * Feed Module
 *
 * Thin Nest shell over `buildFeedUseCases`. All wiring lives in
 * `feed.composition.ts`. The S3 stateful service is exposed as a
 * Nest provider here so DI can construct it once and pass it into
 * the composition.
 */

import { Module } from '@nestjs/common';
import { NotificationsUseCases } from '@/bounded-contexts/notifications/application/ports/notifications.port';
import { NotificationsModule } from '@/bounded-contexts/notifications/notifications.module';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { FeedUseCases } from './application/ports/feed.port';
import { buildFeedUseCases } from './feed.composition';
import { CommentController } from './infrastructure/controllers/comment.controller';
import { EngagementController } from './infrastructure/controllers/engagement.controller';
import { FeedController } from './infrastructure/controllers/feed.controller';
import { PostController } from './infrastructure/controllers/post.controller';
import { UserEngagementController } from './infrastructure/controllers/user-engagement.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    PostController,
    FeedController,
    CommentController,
    EngagementController,
    UserEngagementController,
  ],
  providers: [
    S3UploadService,
    {
      provide: FeedUseCases,
      useFactory: (
        prisma: PrismaService,
        logger: LoggerPort,
        s3: S3UploadService,
        notifications: NotificationsUseCases,
      ) => buildFeedUseCases(prisma, logger, s3, notifications),
      inject: [PrismaService, LoggerPort, S3UploadService, NotificationsUseCases],
    },
  ],
  exports: [FeedUseCases],
})
export class FeedModule {}
