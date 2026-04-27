/**
 * Feed Module
 *
 * ADR-001: POJO use cases drive 5 controllers (post, feed, comment,
 * engagement, user-engagement). Outbound I/O is behind 7 ports
 * (`FeedRepositoryPort`, `CommentRepositoryPort`,
 * `EngagementRepositoryPort`, `PollRepositoryPort`,
 * `ReportRepositoryPort`, `LinkPreviewFetcherPort`,
 * `PostImageStoragePort`) plus `EngagementNotifierPort` which wraps the
 * notifications BC's `CreateNotificationUseCase` so this BC stays
 * isolation-clean.
 */

import { Module } from '@nestjs/common';
import { CreateNotificationUseCase } from '@/bounded-contexts/notifications/application/use-cases/create-notification/create-notification.use-case';
import { NotificationsModule } from '@/bounded-contexts/notifications/notifications.module';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { AnonymousMaskService } from './application/services/anonymous-mask.service';
import { FeedTimelineService } from './application/services/feed-timeline.service';
import { HashtagParserService } from './application/services/hashtag-parser.service';
import { BookmarkPostUseCase } from './application/use-cases/bookmark-post/bookmark-post.use-case';
import { CreateCommentUseCase } from './application/use-cases/create-comment/create-comment.use-case';
import { CreatePostUseCase } from './application/use-cases/create-post/create-post.use-case';
import { DeleteCommentUseCase } from './application/use-cases/delete-comment/delete-comment.use-case';
import { DeletePostUseCase } from './application/use-cases/delete-post/delete-post.use-case';
import { GetPollResultsUseCase } from './application/use-cases/get-poll-results/get-poll-results.use-case';
import { GetPostUseCase } from './application/use-cases/get-post/get-post.use-case';
import { LikePostUseCase } from './application/use-cases/like-post/like-post.use-case';
import { ListCommentRepliesUseCase } from './application/use-cases/list-comment-replies/list-comment-replies.use-case';
import { ListFeedBookmarksUseCase } from './application/use-cases/list-feed-bookmarks/list-feed-bookmarks.use-case';
import { ListFeedTimelineUseCase } from './application/use-cases/list-feed-timeline/list-feed-timeline.use-case';
import { ListPostCommentsUseCase } from './application/use-cases/list-post-comments/list-post-comments.use-case';
import { ListUserCommentsUseCase } from './application/use-cases/list-user-comments/list-user-comments.use-case';
import { ListUserPostsUseCase } from './application/use-cases/list-user-posts/list-user-posts.use-case';
import { ListUserReactionsUseCase } from './application/use-cases/list-user-reactions/list-user-reactions.use-case';
import { ReportPostUseCase } from './application/use-cases/report-post/report-post.use-case';
import { RepostPostUseCase } from './application/use-cases/repost-post/repost-post.use-case';
import { UnbookmarkPostUseCase } from './application/use-cases/unbookmark-post/unbookmark-post.use-case';
import { UnlikePostUseCase } from './application/use-cases/unlike-post/unlike-post.use-case';
import { UploadPostImageUseCase } from './application/use-cases/upload-post-image/upload-post-image.use-case';
import { VoteOnPollUseCase } from './application/use-cases/vote-on-poll/vote-on-poll.use-case';
import { CommentRepositoryPort } from './domain/ports/comment.repository.port';
import { EngagementRepositoryPort } from './domain/ports/engagement.repository.port';
import { EngagementNotifierPort } from './domain/ports/engagement-notifier.port';
import { FeedRepositoryPort } from './domain/ports/feed.repository.port';
import { LinkPreviewFetcherPort } from './domain/ports/link-preview-fetcher.port';
import { PollRepositoryPort } from './domain/ports/poll.repository.port';
import { PostImageStoragePort } from './domain/ports/post-image-storage.port';
import { ReportRepositoryPort } from './domain/ports/report.repository.port';
import { FetchLinkPreviewAdapter } from './infrastructure/adapters/external-services/fetch-link-preview.adapter';
import { NotificationsEngagementNotifierAdapter } from './infrastructure/adapters/external-services/notifications-engagement-notifier.adapter';
import { S3PostImageStorageAdapter } from './infrastructure/adapters/external-services/s3-post-image-storage.adapter';
import { PrismaCommentRepository } from './infrastructure/adapters/persistence/prisma-comment.repository';
import { PrismaEngagementRepository } from './infrastructure/adapters/persistence/prisma-engagement.repository';
import { PrismaFeedRepository } from './infrastructure/adapters/persistence/prisma-feed.repository';
import { PrismaPollRepository } from './infrastructure/adapters/persistence/prisma-poll.repository';
import { PrismaReportRepository } from './infrastructure/adapters/persistence/prisma-report.repository';
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

    // ───────── ports → adapters ─────────
    {
      provide: FeedRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaFeedRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: CommentRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaCommentRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: EngagementRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaEngagementRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: PollRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaPollRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ReportRepositoryPort,
      useFactory: (prisma: PrismaService) => new PrismaReportRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: LinkPreviewFetcherPort,
      useFactory: (logger: LoggerPort) => new FetchLinkPreviewAdapter(logger),
      inject: [LoggerPort],
    },
    {
      provide: PostImageStoragePort,
      useFactory: (s3: S3UploadService) => new S3PostImageStorageAdapter(s3),
      inject: [S3UploadService],
    },
    {
      provide: EngagementNotifierPort,
      useFactory: (create: CreateNotificationUseCase) =>
        new NotificationsEngagementNotifierAdapter(create),
      inject: [CreateNotificationUseCase],
    },

    // ───────── application services ─────────
    { provide: AnonymousMaskService, useFactory: () => new AnonymousMaskService() },
    { provide: HashtagParserService, useFactory: () => new HashtagParserService() },
    {
      provide: FeedTimelineService,
      useFactory: (repo: FeedRepositoryPort, mask: AnonymousMaskService) =>
        new FeedTimelineService(repo, mask),
      inject: [FeedRepositoryPort, AnonymousMaskService],
    },

    // ───────── post use cases ─────────
    {
      provide: CreatePostUseCase,
      useFactory: (
        repo: FeedRepositoryPort,
        link: LinkPreviewFetcherPort,
        hashtags: HashtagParserService,
        logger: LoggerPort,
      ) => new CreatePostUseCase(repo, link, hashtags, logger),
      inject: [FeedRepositoryPort, LinkPreviewFetcherPort, HashtagParserService, LoggerPort],
    },
    {
      provide: GetPostUseCase,
      useFactory: (
        repo: FeedRepositoryPort,
        mask: AnonymousMaskService,
        logger: LoggerPort,
      ) => new GetPostUseCase(repo, mask, logger),
      inject: [FeedRepositoryPort, AnonymousMaskService, LoggerPort],
    },
    {
      provide: DeletePostUseCase,
      useFactory: (repo: FeedRepositoryPort) => new DeletePostUseCase(repo),
      inject: [FeedRepositoryPort],
    },
    {
      provide: UploadPostImageUseCase,
      useFactory: (storage: PostImageStoragePort) => new UploadPostImageUseCase(storage),
      inject: [PostImageStoragePort],
    },

    // ───────── feed use cases ─────────
    {
      provide: ListFeedTimelineUseCase,
      useFactory: (timeline: FeedTimelineService) => new ListFeedTimelineUseCase(timeline),
      inject: [FeedTimelineService],
    },
    {
      provide: ListFeedBookmarksUseCase,
      useFactory: (repo: FeedRepositoryPort) => new ListFeedBookmarksUseCase(repo),
      inject: [FeedRepositoryPort],
    },
    {
      provide: ListUserPostsUseCase,
      useFactory: (repo: FeedRepositoryPort) => new ListUserPostsUseCase(repo),
      inject: [FeedRepositoryPort],
    },

    // ───────── comment use cases ─────────
    {
      provide: ListPostCommentsUseCase,
      useFactory: (repo: CommentRepositoryPort) => new ListPostCommentsUseCase(repo),
      inject: [CommentRepositoryPort],
    },
    {
      provide: CreateCommentUseCase,
      useFactory: (repo: CommentRepositoryPort) => new CreateCommentUseCase(repo),
      inject: [CommentRepositoryPort],
    },
    {
      provide: DeleteCommentUseCase,
      useFactory: (repo: CommentRepositoryPort) => new DeleteCommentUseCase(repo),
      inject: [CommentRepositoryPort],
    },
    {
      provide: ListCommentRepliesUseCase,
      useFactory: (repo: CommentRepositoryPort) => new ListCommentRepliesUseCase(repo),
      inject: [CommentRepositoryPort],
    },
    {
      provide: ListUserCommentsUseCase,
      useFactory: (repo: CommentRepositoryPort) => new ListUserCommentsUseCase(repo),
      inject: [CommentRepositoryPort],
    },

    // ───────── engagement use cases ─────────
    {
      provide: LikePostUseCase,
      useFactory: (
        repo: EngagementRepositoryPort,
        notifier: EngagementNotifierPort,
        logger: LoggerPort,
      ) => new LikePostUseCase(repo, notifier, logger),
      inject: [EngagementRepositoryPort, EngagementNotifierPort, LoggerPort],
    },
    {
      provide: UnlikePostUseCase,
      useFactory: (repo: EngagementRepositoryPort) => new UnlikePostUseCase(repo),
      inject: [EngagementRepositoryPort],
    },
    {
      provide: BookmarkPostUseCase,
      useFactory: (repo: EngagementRepositoryPort) => new BookmarkPostUseCase(repo),
      inject: [EngagementRepositoryPort],
    },
    {
      provide: UnbookmarkPostUseCase,
      useFactory: (repo: EngagementRepositoryPort) => new UnbookmarkPostUseCase(repo),
      inject: [EngagementRepositoryPort],
    },
    {
      provide: RepostPostUseCase,
      useFactory: (
        repo: EngagementRepositoryPort,
        notifier: EngagementNotifierPort,
        hashtags: HashtagParserService,
        logger: LoggerPort,
      ) => new RepostPostUseCase(repo, notifier, hashtags, logger),
      inject: [EngagementRepositoryPort, EngagementNotifierPort, HashtagParserService, LoggerPort],
    },
    {
      provide: ListUserReactionsUseCase,
      useFactory: (repo: EngagementRepositoryPort) => new ListUserReactionsUseCase(repo),
      inject: [EngagementRepositoryPort],
    },

    // ───────── poll + report use cases ─────────
    {
      provide: VoteOnPollUseCase,
      useFactory: (repo: PollRepositoryPort) => new VoteOnPollUseCase(repo),
      inject: [PollRepositoryPort],
    },
    {
      provide: GetPollResultsUseCase,
      useFactory: (repo: PollRepositoryPort) => new GetPollResultsUseCase(repo),
      inject: [PollRepositoryPort],
    },
    {
      provide: ReportPostUseCase,
      useFactory: (repo: ReportRepositoryPort) => new ReportPostUseCase(repo),
      inject: [ReportRepositoryPort],
    },
  ],
  exports: [
    CreatePostUseCase,
    GetPostUseCase,
    DeletePostUseCase,
    LikePostUseCase,
    BookmarkPostUseCase,
    EngagementRepositoryPort,
  ],
})
export class FeedModule {}
