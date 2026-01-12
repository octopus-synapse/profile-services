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
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../auth/interfaces/auth-request.interface';
import { FollowService } from '../services/follow.service';
import { ActivityService } from '../services/activity.service';

// --- Response Types ---

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// --- Controller ---

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
  async follow(
    @CurrentUser() user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<ApiResponse<{ id: string }>> {
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
  async unfollow(
    @CurrentUser() user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<ApiResponse<null>> {
    await this.followService.unfollow(user.userId, targetUserId);

    return {
      success: true,
      data: null,
      message: 'Successfully unfollowed user',
    };
  }

  /**
   * Get followers of a user.
   */
  @Get(':userId/followers')
  @HttpCode(HttpStatus.OK)
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.followService.getFollowers(userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100), // Cap at 100
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get users that a user is following.
   */
  @Get(':userId/following')
  @HttpCode(HttpStatus.OK)
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.followService.getFollowing(userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Check if current user is following target user.
   */
  @Get(':userId/is-following')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async isFollowing(
    @CurrentUser() user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<ApiResponse<{ isFollowing: boolean }>> {
    const isFollowing = await this.followService.isFollowing(
      user.userId,
      targetUserId,
    );

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
  async getSocialStats(
    @Param('userId') userId: string,
  ): Promise<ApiResponse<{ followers: number; following: number }>> {
    const stats = await this.followService.getSocialStats(userId);

    return {
      success: true,
      data: stats,
    };
  }
}
