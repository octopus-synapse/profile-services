/**
 * Bundle token for the feed BC. Doubles as the TypeScript shape and
 * the Nest DI token. Wiring lives in `feed.composition.ts` — Nest-free.
 */

import type { BookmarkPostUseCase } from '../use-cases/bookmark-post/bookmark-post.use-case';
import type { CreateCommentUseCase } from '../use-cases/create-comment/create-comment.use-case';
import type { CreatePostUseCase } from '../use-cases/create-post/create-post.use-case';
import type { DeleteCommentUseCase } from '../use-cases/delete-comment/delete-comment.use-case';
import type { DeletePostUseCase } from '../use-cases/delete-post/delete-post.use-case';
import type { GetPollResultsUseCase } from '../use-cases/get-poll-results/get-poll-results.use-case';
import type { GetPostUseCase } from '../use-cases/get-post/get-post.use-case';
import type { LikePostUseCase } from '../use-cases/like-post/like-post.use-case';
import type { ListCommentRepliesUseCase } from '../use-cases/list-comment-replies/list-comment-replies.use-case';
import type { ListFeedBookmarksUseCase } from '../use-cases/list-feed-bookmarks/list-feed-bookmarks.use-case';
import type { ListFeedTimelineUseCase } from '../use-cases/list-feed-timeline/list-feed-timeline.use-case';
import type { ListPostCommentsUseCase } from '../use-cases/list-post-comments/list-post-comments.use-case';
import type { ListUserCommentsUseCase } from '../use-cases/list-user-comments/list-user-comments.use-case';
import type { ListUserPostsUseCase } from '../use-cases/list-user-posts/list-user-posts.use-case';
import type { ListUserReactionsUseCase } from '../use-cases/list-user-reactions/list-user-reactions.use-case';
import type { ReportPostUseCase } from '../use-cases/report-post/report-post.use-case';
import type { RepostPostUseCase } from '../use-cases/repost-post/repost-post.use-case';
import type { UnbookmarkPostUseCase } from '../use-cases/unbookmark-post/unbookmark-post.use-case';
import type { UnlikePostUseCase } from '../use-cases/unlike-post/unlike-post.use-case';
import type { UploadPostImageUseCase } from '../use-cases/upload-post-image/upload-post-image.use-case';
import type { VoteOnPollUseCase } from '../use-cases/vote-on-poll/vote-on-poll.use-case';

export abstract class FeedUseCases {
  abstract readonly createPost: CreatePostUseCase;
  abstract readonly getPost: GetPostUseCase;
  abstract readonly deletePost: DeletePostUseCase;
  abstract readonly uploadPostImage: UploadPostImageUseCase;
  abstract readonly listFeedTimeline: ListFeedTimelineUseCase;
  abstract readonly listFeedBookmarks: ListFeedBookmarksUseCase;
  abstract readonly listUserPosts: ListUserPostsUseCase;
  abstract readonly listPostComments: ListPostCommentsUseCase;
  abstract readonly createComment: CreateCommentUseCase;
  abstract readonly deleteComment: DeleteCommentUseCase;
  abstract readonly listCommentReplies: ListCommentRepliesUseCase;
  abstract readonly listUserComments: ListUserCommentsUseCase;
  abstract readonly likePost: LikePostUseCase;
  abstract readonly unlikePost: UnlikePostUseCase;
  abstract readonly bookmarkPost: BookmarkPostUseCase;
  abstract readonly unbookmarkPost: UnbookmarkPostUseCase;
  abstract readonly repostPost: RepostPostUseCase;
  abstract readonly listUserReactions: ListUserReactionsUseCase;
  abstract readonly voteOnPoll: VoteOnPollUseCase;
  abstract readonly getPollResults: GetPollResultsUseCase;
  abstract readonly reportPost: ReportPostUseCase;
}
