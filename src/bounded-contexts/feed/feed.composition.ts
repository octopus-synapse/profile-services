/**
 * Pure-TS wiring for the feed BC. Zero `@nestjs/*` imports.
 *
 * Cross-BC dep: `notifications` is consumed via a typed
 * `Pick<NotificationsUseCases, 'createNotification'>` so this file
 * doesn't depend on the whole notifications surface.
 */

import type { NotificationsUseCases } from '@/bounded-contexts/notifications/application/ports/notifications.port';
import type { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { FeedUseCases } from './application/ports/feed.port';
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
import { feedRoutes } from './feed.routes';
import { FetchLinkPreviewAdapter } from './infrastructure/adapters/external-services/fetch-link-preview.adapter';
import { NotificationsEngagementNotifierAdapter } from './infrastructure/adapters/external-services/notifications-engagement-notifier.adapter';
import { S3PostImageStorageAdapter } from './infrastructure/adapters/external-services/s3-post-image-storage.adapter';
import { PrismaCommentRepository } from './infrastructure/adapters/persistence/prisma-comment.repository';
import { PrismaEngagementRepository } from './infrastructure/adapters/persistence/prisma-engagement.repository';
import { PrismaFeedRepository } from './infrastructure/adapters/persistence/prisma-feed.repository';
import { PrismaPollRepository } from './infrastructure/adapters/persistence/prisma-poll.repository';
import { PrismaReportRepository } from './infrastructure/adapters/persistence/prisma-report.repository';

export { FeedUseCases };

export function buildFeedUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  s3: S3UploadService,
  notifications: Pick<NotificationsUseCases, 'createNotification'>,
): FeedUseCases {
  // Repos
  const feedRepo = new PrismaFeedRepository(prisma, logger);
  const commentRepo = new PrismaCommentRepository(prisma);
  const engagementRepo = new PrismaEngagementRepository(prisma);
  const pollRepo = new PrismaPollRepository(prisma);
  const reportRepo = new PrismaReportRepository(prisma);

  // External adapters
  const linkPreview = new FetchLinkPreviewAdapter(logger);
  const imageStorage = new S3PostImageStorageAdapter(s3);
  const notifier = new NotificationsEngagementNotifierAdapter(notifications.createNotification);

  // App services
  const mask = new AnonymousMaskService();
  const hashtags = new HashtagParserService();
  const timeline = new FeedTimelineService(feedRepo, mask);

  return {
    createPost: new CreatePostUseCase(feedRepo, linkPreview, hashtags, logger),
    getPost: new GetPostUseCase(feedRepo, mask, logger),
    deletePost: new DeletePostUseCase(feedRepo),
    uploadPostImage: new UploadPostImageUseCase(imageStorage),

    listFeedTimeline: new ListFeedTimelineUseCase(timeline),
    listFeedBookmarks: new ListFeedBookmarksUseCase(feedRepo),
    listUserPosts: new ListUserPostsUseCase(feedRepo),

    listPostComments: new ListPostCommentsUseCase(commentRepo),
    createComment: new CreateCommentUseCase(commentRepo),
    deleteComment: new DeleteCommentUseCase(commentRepo),
    listCommentReplies: new ListCommentRepliesUseCase(commentRepo),
    listUserComments: new ListUserCommentsUseCase(commentRepo),

    likePost: new LikePostUseCase(engagementRepo, notifier, logger),
    unlikePost: new UnlikePostUseCase(engagementRepo),
    bookmarkPost: new BookmarkPostUseCase(engagementRepo),
    unbookmarkPost: new UnbookmarkPostUseCase(engagementRepo),
    repostPost: new RepostPostUseCase(engagementRepo, notifier, hashtags, logger),
    listUserReactions: new ListUserReactionsUseCase(engagementRepo),

    voteOnPoll: new VoteOnPollUseCase(pollRepo),
    getPollResults: new GetPollResultsUseCase(pollRepo),
    reportPost: new ReportPostUseCase(reportRepo),
  };
}

export function buildFeedComposition(
  prisma: PrismaService,
  logger: LoggerPort,
  s3: S3UploadService,
  notifications: Pick<NotificationsUseCases, 'createNotification'>,
): BoundedContextComposition<FeedUseCases> {
  const useCases = buildFeedUseCases(prisma, logger, s3, notifications);

  return {
    useCases,
    routes: feedRoutes,
  };
}
