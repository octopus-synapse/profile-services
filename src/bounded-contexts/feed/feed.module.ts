/**
 * Feed Module
 *
 * Bounded context for the social feed: posts, comments, engagement, polls, and reporting.
 */

import { Module } from '@nestjs/common';
import { NotificationsModule } from '@/bounded-contexts/notifications/notifications.module';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { CommentController } from './controllers/comment.controller';
import { EngagementController } from './controllers/engagement.controller';
import { FeedController } from './controllers/feed.controller';
import { PostController } from './controllers/post.controller';
import { CommentService } from './services/comment.service';
import { EngagementService } from './services/engagement.service';
import { FeedService } from './services/feed.service';
import { LinkPreviewService } from './services/link-preview.service';
import { PollService } from './services/poll.service';
import { PostService } from './services/post.service';
import { ReportService } from './services/report.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PostController, FeedController, CommentController, EngagementController],
  providers: [
    PostService,
    FeedService,
    CommentService,
    EngagementService,
    PollService,
    LinkPreviewService,
    ReportService,
    S3UploadService,
  ],
  exports: [PostService, EngagementService],
})
export class FeedModule {}
