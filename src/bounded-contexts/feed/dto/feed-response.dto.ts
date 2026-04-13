/**
 * Feed Response DTOs
 *
 * Data Transfer Objects for feed, post, comment, and engagement API responses.
 * Used by Swagger decorators to document response bodies.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Shared / Nested DTOs
// ============================================================================

class AuthorDto {
  @ApiProperty({ example: 'user-123' })
  id!: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'johndoe', nullable: true })
  username!: string | null;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true })
  photoURL!: string | null;
}

class OriginalPostDto {
  @ApiProperty({ example: 'post-456' })
  id!: string;

  @ApiProperty()
  author!: AuthorDto;
}

// ============================================================================
// Post DTOs
// ============================================================================

export class PostDto {
  @ApiProperty({ example: 'post-123' })
  id!: string;

  @ApiProperty({ example: 'user-123' })
  authorId!: string;

  @ApiProperty({ example: 'TEXT' })
  type!: string;

  @ApiPropertyOptional({ example: 'article' })
  subtype?: string;

  @ApiPropertyOptional({ example: 'Hello world!' })
  content?: string;

  @ApiProperty({ type: [String], example: ['typescript'] })
  hardSkills!: string[];

  @ApiProperty({ type: [String], example: ['leadership'] })
  softSkills!: string[];

  @ApiProperty({ type: [String], example: ['#tech'] })
  hashtags!: string[];

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  linkUrl?: string;

  @ApiProperty({ example: 0 })
  likesCount!: number;

  @ApiProperty({ example: 0 })
  commentsCount!: number;

  @ApiProperty({ example: 0 })
  repostsCount!: number;

  @ApiProperty({ example: 0 })
  bookmarksCount!: number;

  @ApiProperty({ example: false })
  isDeleted!: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty()
  author!: AuthorDto;

  @ApiPropertyOptional()
  originalPost?: OriginalPostDto;
}

export class PostCreatedDataDto extends PostDto {}

export class PostByIdDataDto extends PostDto {}

export class PostDeletedDataDto {
  @ApiProperty({ example: true })
  deleted!: boolean;
}

export class PostImageUploadDataDto {
  @ApiProperty({ example: 'https://cdn.example.com/posts/user-123/image.jpg' })
  url!: string;

  @ApiProperty({ example: 'posts/user-123/image.jpg' })
  key!: string;
}

// ============================================================================
// Feed DTOs
// ============================================================================

class FeedPostDto extends PostDto {
  @ApiPropertyOptional({ example: true })
  isLiked?: boolean;

  @ApiPropertyOptional({ example: false })
  isBookmarked?: boolean;
}

export class FeedTimelineDataDto {
  @ApiProperty({ type: [FeedPostDto] })
  posts!: FeedPostDto[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', nullable: true })
  nextCursor!: string | null;
}

export class FeedBookmarksDataDto {
  @ApiProperty({ type: [FeedPostDto] })
  posts!: FeedPostDto[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', nullable: true })
  nextCursor!: string | null;
}

export class UserPostsDataDto {
  @ApiProperty({ type: [PostDto] })
  posts!: PostDto[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', nullable: true })
  nextCursor!: string | null;
}

// ============================================================================
// Comment DTOs
// ============================================================================

class CommentReplyDto {
  @ApiProperty({ example: 'comment-789' })
  id!: string;

  @ApiProperty({ example: 'post-123' })
  postId!: string;

  @ApiProperty({ example: 'user-456' })
  authorId!: string;

  @ApiProperty({ example: 'Great point!' })
  content!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty()
  author!: AuthorDto;
}

class CommentDto extends CommentReplyDto {
  @ApiProperty({ type: [CommentReplyDto] })
  replies!: CommentReplyDto[];
}

export class CommentsListDataDto {
  @ApiProperty({ type: [CommentDto] })
  comments!: CommentDto[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', nullable: true })
  nextCursor!: string | null;
}

export class CommentCreatedDataDto extends CommentReplyDto {}

export class CommentDeletedDataDto {
  @ApiProperty({ example: true })
  deleted!: boolean;
}

// ============================================================================
// Engagement DTOs
// ============================================================================

export class LikeDataDto {
  @ApiProperty({ example: 'post-123' })
  postId!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiPropertyOptional({ example: 'user-456' })
  postAuthorId?: string;

  @ApiProperty({ example: false })
  alreadyLiked!: boolean;
}

export class UnlikeDataDto {
  @ApiProperty({ example: 'post-123' })
  postId!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;
}

export class BookmarkDataDto {
  @ApiProperty({ example: 'post-123' })
  postId!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiProperty({ example: false })
  alreadyBookmarked!: boolean;
}

export class UnbookmarkDataDto {
  @ApiProperty({ example: 'post-123' })
  postId!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;
}

export class RepostDataDto {
  @ApiPropertyOptional({ example: 'post-123' })
  postId?: string;

  @ApiPropertyOptional({ example: 'user-123' })
  userId?: string;

  @ApiPropertyOptional({ example: true })
  reposted?: boolean;

  @ApiPropertyOptional({ example: 'post-789' })
  id?: string;

  @ApiPropertyOptional()
  author?: AuthorDto;
}

export class ReportDataDto {
  @ApiProperty({ example: 'report-123' })
  id!: string;

  @ApiProperty({ example: 'post-123' })
  postId!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiProperty({ example: 'Inappropriate content' })
  reason!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class VoteDataDto {
  @ApiProperty({ example: 'vote-123' })
  id!: string;

  @ApiProperty({ example: 'post-123' })
  postId!: string;

  @ApiProperty({ example: 'user-123' })
  userId!: string;

  @ApiProperty({ example: 0 })
  optionIndex!: number;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;
}
