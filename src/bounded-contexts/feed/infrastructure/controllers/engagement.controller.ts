/**
 * Engagement Controller
 *
 * Endpoints:
 * - POST   /v1/posts/:id/like       - Like a post
 * - DELETE /v1/posts/:id/like       - Unlike a post
 * - POST   /v1/posts/:id/bookmark   - Bookmark a post
 * - DELETE /v1/posts/:id/bookmark   - Remove bookmark
 * - POST   /v1/posts/:id/repost     - Repost a post
 * - POST   /v1/posts/:id/report     - Report a post
 * - POST   /v1/posts/:id/poll/vote  - Vote on a poll
 */

import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { ReactionType } from '@prisma/client';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { BookmarkPostUseCase } from '../../application/use-cases/bookmark-post/bookmark-post.use-case';
import { LikePostUseCase } from '../../application/use-cases/like-post/like-post.use-case';
import { ReportPostUseCase } from '../../application/use-cases/report-post/report-post.use-case';
import { RepostPostUseCase } from '../../application/use-cases/repost-post/repost-post.use-case';
import { UnbookmarkPostUseCase } from '../../application/use-cases/unbookmark-post/unbookmark-post.use-case';
import { UnlikePostUseCase } from '../../application/use-cases/unlike-post/unlike-post.use-case';
import { VoteOnPollUseCase } from '../../application/use-cases/vote-on-poll/vote-on-poll.use-case';
import {
  BookmarkDataDto,
  LikeDataDto,
  ReportDataDto,
  RepostDataDto,
  UnbookmarkDataDto,
  UnlikeDataDto,
  VoteDataDto,
} from '../../dto/feed-response.dto';

@SdkExport({ tag: 'engagement', description: 'Engagement API', requiresAuth: true })
@ApiTags('engagement')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/posts')
export class EngagementController {
  constructor(
    private readonly likePostUseCase: LikePostUseCase,
    private readonly unlikePostUseCase: UnlikePostUseCase,
    private readonly bookmarkPostUseCase: BookmarkPostUseCase,
    private readonly unbookmarkPostUseCase: UnbookmarkPostUseCase,
    private readonly repostPostUseCase: RepostPostUseCase,
    private readonly reportPostUseCase: ReportPostUseCase,
    private readonly voteOnPollUseCase: VoteOnPollUseCase,
  ) {}

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(LikeDataDto, { description: 'Post liked' })
  async like(
    @CurrentUser() user: UserPayload,
    @Param('id') postId: string,
    @Body() body: { reactionType?: ReactionType },
  ) {
    return this.likePostUseCase.execute(postId, user.userId, body.reactionType);
  }

  @Delete(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(UnlikeDataDto, { description: 'Post unliked' })
  async unlike(@CurrentUser() user: UserPayload, @Param('id') postId: string) {
    return this.unlikePostUseCase.execute(postId, user.userId);
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bookmark a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(BookmarkDataDto, { description: 'Post bookmarked' })
  async bookmark(@CurrentUser() user: UserPayload, @Param('id') postId: string) {
    return this.bookmarkPostUseCase.execute(postId, user.userId);
  }

  @Delete(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove bookmark from a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(UnbookmarkDataDto, { description: 'Bookmark removed' })
  async unbookmark(@CurrentUser() user: UserPayload, @Param('id') postId: string) {
    return this.unbookmarkPostUseCase.execute(postId, user.userId);
  }

  @Post(':id/repost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Repost a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(RepostDataDto, { description: 'Post reposted' })
  async repost(
    @CurrentUser() user: UserPayload,
    @Param('id') postId: string,
    @Body() body: { commentary?: string },
  ) {
    return this.repostPostUseCase.execute(postId, user.userId, body.commentary);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(ReportDataDto, { description: 'Post reported' })
  async report(
    @CurrentUser() user: UserPayload,
    @Param('id') postId: string,
    @Body() body: { reason: string },
  ) {
    return this.reportPostUseCase.execute(postId, user.userId, body.reason);
  }

  @Post(':id/poll/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vote on a poll' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(VoteDataDto, { description: 'Vote recorded' })
  async vote(
    @CurrentUser() user: UserPayload,
    @Param('id') postId: string,
    @Body() body: { optionIndex: number },
  ) {
    return this.voteOnPollUseCase.execute(postId, user.userId, body.optionIndex);
  }
}
