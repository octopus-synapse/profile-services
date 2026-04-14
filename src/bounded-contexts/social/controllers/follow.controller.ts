/**
 * Follow Controller
 *
 * Handles HTTP endpoints for follow/unfollow operations.
 *
 * Endpoints:
 * - POST   /v1/users/:userId/follow     - Follow a user
 * - DELETE /v1/users/:userId/follow     - Unfollow a user
 * - GET    /v1/users/:userId/followers  - Get followers
 * - GET    /v1/users/:userId/following  - Get following
 * - GET    /v1/users/:userId/is-following - Check if following
 * - GET    /v1/users/:userId/social-stats - Get social stats
 */

import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ActivityLoggerPort,
  ConnectionReaderPort,
  FollowReaderPort,
} from '../application/ports/facade.ports';
import {
  FollowingListDataDto,
  FollowListDataDto,
  UnfollowDataDto,
} from '../dto/controller-response.dto';

class FollowIdDto {
  @ApiProperty({ example: 'follow-123' })
  id!: string;
}

class FollowRelationshipDto {
  @ApiProperty({ example: true })
  isFollowing!: boolean;
}

class SocialStatsDto {
  @ApiProperty({ example: 120 })
  followers!: number;

  @ApiProperty({ example: 75 })
  following!: number;

  @ApiProperty({ example: 30 })
  connections!: number;
}

class MySocialStatsDto extends SocialStatsDto {
  @ApiProperty({ example: 3 })
  pendingInvitations!: number;
}

// --- Controller ---

@ApiTags('social-follow')
@Controller('v1/users')
export class FollowController {
  constructor(
    private readonly followService: FollowReaderPort,
    private readonly activityService: ActivityLoggerPort,
    private readonly connectionService: ConnectionReaderPort,
  ) {}

  /**
   * Follow a user.
   */
  @Post(':userId/follow')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(FollowIdDto, { description: 'User followed successfully' })
  async follow(
    @CurrentUser() user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<DataResponse<FollowIdDto>> {
    const follow = await this.followService.follow(user.userId, targetUserId);

    // Log activity (fire-and-forget)
    if (follow.following) {
      this.activityService
        .logFollowedUser(
          user.userId,
          targetUserId,
          follow.following.name ?? follow.following.username ?? 'User',
        )
        .catch(() => {
          // Ignore activity logging errors
        });
    }

    return {
      success: true,
      data: { id: follow.id },
      message: 'Successfully followed user',
    };
  }

  /**
   * Unfollow a user.
   */
  @Delete(':userId/follow')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(UnfollowDataDto, {
    description: 'User unfollowed successfully',
  })
  async unfollow(
    @CurrentUser() user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<DataResponse<UnfollowDataDto>> {
    await this.followService.unfollow(user.userId, targetUserId);

    return {
      success: true,
      message: 'User unfollowed successfully',
      data: { unfollowed: true },
    };
  }

  /**
   * Get followers of a user.
   */
  @Get(':userId/followers')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get followers for a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(FollowListDataDto, {
    description: 'Followers list returned',
  })
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<DataResponse<FollowListDataDto>> {
    const result = await this.followService.getFollowers(userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100), // Cap at 100
    });

    return {
      success: true,
      data: {
        followers: result,
      },
    };
  }

  /**
   * Get users that a user is following.
   */
  @Get(':userId/following')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get users followed by a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(FollowingListDataDto, {
    description: 'Following list returned',
  })
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<DataResponse<FollowingListDataDto>> {
    const result = await this.followService.getFollowing(userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: {
        following: result,
      },
    };
  }

  /**
   * Check if current user is following target user.
   */
  @Get(':userId/is-following')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check following relationship' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(FollowRelationshipDto, {
    description: 'Following relationship returned',
  })
  async isFollowing(
    @CurrentUser() user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<DataResponse<FollowRelationshipDto>> {
    const isFollowing = await this.followService.isFollowing(user.userId, targetUserId);

    return {
      success: true,
      data: { isFollowing },
    };
  }

  /**
   * Get social stats for the authenticated user, including pending invitations.
   */
  @Get('me/social-stats')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get social stats for authenticated user' })
  @ApiDataResponse(MySocialStatsDto, { description: 'Social stats returned' })
  async getMySocialStats(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<MySocialStatsDto>> {
    const [stats, pendingResult] = await Promise.all([
      this.followService.getSocialStats(user.userId),
      this.connectionService.getPendingRequests(user.userId, { page: 1, limit: 1 }),
    ]);

    return {
      success: true,
      data: {
        ...stats,
        pendingInvitations: pendingResult.total,
      },
    };
  }

  /**
   * Get social stats (followers and following counts) for a user.
   */
  @Get(':userId/social-stats')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get social stats for a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(SocialStatsDto, { description: 'Social stats returned' })
  async getSocialStats(@Param('userId') userId: string): Promise<DataResponse<SocialStatsDto>> {
    const stats = await this.followService.getSocialStats(userId);

    return {
      success: true,
      data: stats,
    };
  }
}
