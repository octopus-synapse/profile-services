/**
 * Activity Controller
 *
 * Handles HTTP endpoints for activity feeds.
 *
 * Endpoints:
 * - GET /v1/users/:userId/feed              - Get activity feed for user
 * - GET /v1/users/:userId/activities        - Get user's own activities
 * - GET /v1/users/:userId/activities/by-type/:type - Filter activities by type
 */

import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ActivityType } from '@prisma/client';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { JwtAuthGuard } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { ActivityFeedDataDto, ActivityListDataDto } from '../dto/controller-response.dto';
import { ActivityService } from '../services/activity.service';

// --- Controller ---

@ApiTags('social-activity')
@Controller('v1/users')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get activity feed for authenticated user.
   * Shows activities from users they follow.
   */
  @Get(':userId/feed')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get authenticated user activity feed' })
  @ApiDataResponse(ActivityFeedDataDto, {
    description: 'Activity feed returned',
  })
  async getFeed(
    @CurrentUser() user: UserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<DataResponse<ActivityFeedDataDto>> {
    const result = await this.activityService.getFeed(user.userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: {
        feed: result,
      },
    };
  }

  /**
   * Get a user's own activities.
   * Public endpoint - shows what a user has done.
   */
  @Get(':userId/activities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public activities for a user' })
  @ApiDataResponse(ActivityListDataDto, {
    description: 'User activities returned',
  })
  async getUserActivities(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<DataResponse<ActivityListDataDto>> {
    const result = await this.activityService.getUserActivities(userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: {
        activities: result,
      },
    };
  }

  /**
   * Get a user's activities filtered by type.
   */
  @Get(':userId/activities/by-type/:type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user activities filtered by type' })
  @ApiDataResponse(ActivityListDataDto, {
    description: 'Filtered activities returned',
  })
  async getActivitiesByType(
    @Param('userId') userId: string,
    @Param('type') type: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<DataResponse<ActivityListDataDto>> {
    const result = await this.activityService.getActivitiesByType(userId, type as ActivityType, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: {
        activities: result,
      },
    };
  }
}
