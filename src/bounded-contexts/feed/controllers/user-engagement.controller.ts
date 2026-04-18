/**
 * User Engagement Controller
 *
 * Endpoints scoped to a user's footprint across the feed (used by profile
 * activity tabs):
 * - GET /v1/users/:userId/comments  - Comments authored by the user
 * - GET /v1/users/:userId/reactions - Reactions given by the user
 */

import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import { CommentService } from '../services/comment.service';
import { EngagementService } from '../services/engagement.service';

@SdkExport({
  tag: 'user-engagement',
  description: 'User-scoped feed engagement',
  requiresAuth: true,
})
@ApiTags('user-engagement')
@ApiBearerAuth('JWT-auth')
@RequirePermission(Permission.FEED_USE)
@Controller('v1/users')
export class UserEngagementController {
  constructor(
    private readonly commentService: CommentService,
    private readonly engagementService: EngagementService,
  ) {}

  @Get(':userId/comments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List comments authored by a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getComments(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.commentService.getByUser(userId, cursor, limit ? Number(limit) : undefined);
  }

  @Get(':userId/reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List reactions given by a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getReactions(
    @Param('userId') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.engagementService.getReactionsByUser(
      userId,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }
}
