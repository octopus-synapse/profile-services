/**
 * Feed Controller
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
import { ListFeedBookmarksUseCase } from '../../application/use-cases/list-feed-bookmarks/list-feed-bookmarks.use-case';
import { ListFeedTimelineUseCase } from '../../application/use-cases/list-feed-timeline/list-feed-timeline.use-case';
import { ListUserPostsUseCase } from '../../application/use-cases/list-user-posts/list-user-posts.use-case';
import {
  FeedBookmarksDataDto,
  FeedTimelineDataDto,
  UserPostsDataDto,
} from '../../dto/feed-response.dto';

@SdkExport({ tag: 'feed', description: 'Feed API', requiresAuth: true })
@ApiTags('feed')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/feed')
export class FeedController {
  constructor(
    private readonly listFeedTimelineUseCase: ListFeedTimelineUseCase,
    private readonly listFeedBookmarksUseCase: ListFeedBookmarksUseCase,
    private readonly listUserPostsUseCase: ListUserPostsUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get feed timeline' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({
    name: 'followingOnly',
    required: false,
    type: Boolean,
    description: 'When true, restricts to posts from users the viewer follows ("Minha bolha").',
  })
  @ApiDataResponse(FeedTimelineDataDto, { description: 'Feed timeline with posts' })
  async getTimeline(
    @CurrentUser() user: UserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('type') type?: PostType,
    @Query('followingOnly') followingOnly?: string,
  ) {
    return this.listFeedTimelineUseCase.execute({
      userId: user.userId,
      cursor,
      limit: limit ? Math.min(Number(limit), 50) : 20,
      type,
      followingOnly: followingOnly === 'true' || followingOnly === '1',
    });
  }

  @Get('bookmarks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get bookmarked posts' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(FeedBookmarksDataDto, { description: 'Bookmarked posts' })
  async getBookmarks(
    @CurrentUser() user: UserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.listFeedBookmarksUseCase.execute(
      user.userId,
      cursor,
      limit ? Math.min(Number(limit), 50) : 20,
    );
  }

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
    return this.listUserPostsUseCase.execute(
      userId,
      cursor,
      limit ? Math.min(Number(limit), 50) : 20,
    );
  }
}
