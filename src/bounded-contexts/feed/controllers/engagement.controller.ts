/**
 * Engagement Controller
 *
 * Handles HTTP endpoints for post engagement actions:
 * likes, bookmarks, reposts, reports, and poll voting.
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
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  BookmarkDataDto,
  LikeDataDto,
  ReportDataDto,
  RepostDataDto,
  UnbookmarkDataDto,
  UnlikeDataDto,
  VoteDataDto,
} from '../dto/feed-response.dto';
import { EngagementService } from '../services/engagement.service';
import { PollService } from '../services/poll.service';
import { ReportService } from '../services/report.service';

@SdkExport({
  tag: 'engagement',
  description: 'Engagement API',
  requiresAuth: true,
})
@ApiTags('engagement')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/posts')
export class EngagementController {
  constructor(
    private readonly engagementService: EngagementService,
    private readonly pollService: PollService,
    private readonly reportService: ReportService,
  ) {}

  /**
   * Like a post.
   */
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(LikeDataDto, { description: 'Post liked' })
  async like(@CurrentUser() user: UserPayload, @Param('id') postId: string) {
    return this.engagementService.like(postId, user.userId);
  }

  /**
   * Unlike a post.
   */
  @Delete(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(UnlikeDataDto, { description: 'Post unliked' })
  async unlike(@CurrentUser() user: UserPayload, @Param('id') postId: string) {
    return this.engagementService.unlike(postId, user.userId);
  }

  /**
   * Bookmark a post.
   */
  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bookmark a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(BookmarkDataDto, { description: 'Post bookmarked' })
  async bookmark(@CurrentUser() user: UserPayload, @Param('id') postId: string) {
    return this.engagementService.bookmark(postId, user.userId);
  }

  /**
   * Remove bookmark from a post.
   */
  @Delete(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove bookmark from a post' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiDataResponse(UnbookmarkDataDto, { description: 'Bookmark removed' })
  async unbookmark(@CurrentUser() user: UserPayload, @Param('id') postId: string) {
    return this.engagementService.unbookmark(postId, user.userId);
  }

  /**
   * Repost a post, optionally with commentary.
   */
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
    return this.engagementService.repost(postId, user.userId, body.commentary);
  }

  /**
   * Report a post.
   */
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
    return this.reportService.create(postId, user.userId, body.reason);
  }

  /**
   * Vote on a poll.
   */
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
    return this.pollService.vote(postId, user.userId, body.optionIndex);
  }
}
