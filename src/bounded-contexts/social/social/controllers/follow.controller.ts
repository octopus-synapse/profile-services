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

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import {
  FollowingListDataDto,
  FollowListDataDto,
  UnfollowDataDto,
} from '../dto/controller-response.dto';
import { ActivityService } from '../services/activity.service';
import { FollowService } from '../services/follow.service';

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
}

// --- Controller ---

@ApiTags('social-follow')
@Controller('v1/users')
export class FollowController {
  constructor(
    private readonly followService: FollowService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Follow a user.
   */
  @Post(':userId/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a user' })
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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a user' })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get followers for a user' })
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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check following relationship' })
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
   * Get social stats (followers and following counts) for a user.
   */
  @Get(':userId/social-stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get social stats for a user' })
  @ApiDataResponse(SocialStatsDto, { description: 'Social stats returned' })
  async getSocialStats(@Param('userId') userId: string): Promise<DataResponse<SocialStatsDto>> {
    const stats = await this.followService.getSocialStats(userId);

    return {
      success: true,
      data: stats,
    };
  }
}
