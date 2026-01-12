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

import {
  Controller,
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
import { ActivityService } from '../services/activity.service';
import type { ActivityType } from '@prisma/client';

// --- Response Types ---

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// --- Controller ---

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
  async getFeed(
    @CurrentUser() user: UserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.activityService.getFeed(user.userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get a user's own activities.
   * Public endpoint - shows what a user has done.
   */
  @Get(':userId/activities')
  @HttpCode(HttpStatus.OK)
  async getUserActivities(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.activityService.getUserActivities(userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get a user's activities filtered by type.
   */
  @Get(':userId/activities/by-type/:type')
  @HttpCode(HttpStatus.OK)
  async getActivitiesByType(
    @Param('userId') userId: string,
    @Param('type') type: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.activityService.getActivitiesByType(
      userId,
      type as ActivityType,
      {
        page: Number(page),
        limit: Math.min(Number(limit), 100),
      },
    );

    return {
      success: true,
      data: result,
    };
  }
}
