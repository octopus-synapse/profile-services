/**
 * Feed Controller
 *
 * Handles HTTP endpoints for feed timeline and bookmarks.
 *
 * Endpoints:
 * - GET /v1/feed              - Get feed timeline
 * - GET /v1/feed/bookmarks    - Get bookmarked posts
 * - GET /v1/feed/user/:userId - Get posts by a specific user
 */

import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { PostType } from '@prisma/client';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  FeedBookmarksDataDto,
  FeedTimelineDataDto,
  UserPostsDataDto,
} from '../dto/feed-response.dto';
import { FeedService } from '../services/feed.service';
import { PostService } from '../services/post.service';

@SdkExport({
  tag: 'feed',
  description: 'Feed API',
  requiresAuth: true,
})
@ApiTags('feed')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly postService: PostService,
  ) {}

  /**
   * Get the user's feed timeline.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get feed timeline' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiDataResponse(FeedTimelineDataDto, {
    description: 'Feed timeline with posts',
  })
  async getTimeline(
    @CurrentUser() user: UserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('type') type?: PostType,
  ) {
    return this.feedService.getTimeline(
      user.userId,
      cursor,
      limit ? Math.min(Number(limit), 50) : 20,
      type,
    );
  }

  /**
   * Get posts bookmarked by the current user.
   */
  @Get('bookmarks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get bookmarked posts' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(FeedBookmarksDataDto, {
    description: 'Bookmarked posts',
  })
  async getBookmarks(
    @CurrentUser() user: UserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.feedService.getBookmarks(
      user.userId,
      cursor,
      limit ? Math.min(Number(limit), 50) : 20,
    );
  }

  /**
   * Get posts by a specific user.
   */
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get posts by user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(UserPostsDataDto, { description: 'User posts' })
  async getUserPosts(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.postService.getUserPosts(userId, cursor, limit ? Math.min(Number(limit), 50) : 20);
  }
}
