/**
 * Activity Service
 *
 * Handles user activity tracking and feed generation.
 * Activities are events that users can see in their feed.
 *
 * Kent Beck: "Make it work, make it right, make it fast."
 */

import { Injectable } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { SocialRepository } from '../repositories/social.repository';
import {
  FollowService,
  PaginationParams,
  PaginatedResult,
} from './follow.service';
import { AppLoggerService } from '../../common/logger/logger.service';

// --- Types ---

export interface ActivityWithUser {
  id: string;
  userId: string;
  type: ActivityType;
  metadata: unknown;
  entityId: string | null;
  entityType: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
    username: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

// --- Service ---

@Injectable()
export class ActivityService {
  constructor(
    private readonly repository: SocialRepository,
    private readonly followService: FollowService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Create a new activity record.
   */
  async createActivity(
    userId: string,
    type: ActivityType,
    metadata?: unknown,
    entityId?: string,
    entityType?: string,
  ): Promise<ActivityWithUser> {
    const activity = await this.repository.createActivity({
      userId,
      type,
      metadata,
      entityId,
      entityType,
    });

    this.logger.debug(
      `Created activity ${type} for user ${userId}`,
      'ActivityService',
    );

    return activity as ActivityWithUser;
  }

  /**
   * Get activity feed for a user.
   * Returns activities from users the current user follows.
   */
  async getFeed(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Get list of followed user IDs
    const followingIds = await this.followService.getFollowingIds(userId);

    if (followingIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const [data, total] = await Promise.all([
      this.repository.findActivitiesWithPagination(
        { where: { userId: { in: followingIds } }, skip, take: limit },
        true,
      ),
      this.repository.countActivities({ userId: { in: followingIds } }),
    ]);

    return {
      data: data as ActivityWithUser[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get activities for a specific user.
   */
  async getUserActivities(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.repository.findActivitiesWithPagination(
        { where: { userId }, skip, take: limit },
        false,
      ),
      this.repository.countActivities({ userId }),
    ]);
    return {
      data: data as ActivityWithUser[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get activities for a user filtered by type.
   */
  async getActivitiesByType(
    userId: string,
    type: ActivityType,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.repository.findActivitiesWithPagination(
        { where: { userId, type }, skip, take: limit },
        false,
      ),
      this.repository.countActivities({ userId, type }),
    ]);

    return {
      data: data as ActivityWithUser[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete activities older than specified number of days.
   * Useful for cleanup cron jobs.
   */
  async deleteOldActivities(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.repository.deleteActivitiesOlderThan(cutoffDate);

    this.logger.log(
      `Deleted ${result.count} activities older than ${days} days`,
      'ActivityService',
    );

    return result.count;
  }

  /**
   * Log a resume creation activity.
   */
  async logResumeCreated(
    userId: string,
    resumeId: string,
    resumeTitle: string,
  ): Promise<void> {
    await this.createActivity(
      userId,
      ActivityType.RESUME_CREATED,
      { resumeId, title: resumeTitle },
      resumeId,
      'resume',
    );
  }

  /**
   * Log a resume update activity.
   */
  async logResumeUpdated(
    userId: string,
    resumeId: string,
    changes: string[],
  ): Promise<void> {
    await this.createActivity(
      userId,
      ActivityType.RESUME_UPDATED,
      { resumeId, changes },
      resumeId,
      'resume',
    );
  }

  /**
   * Log when a user follows another user.
   */
  async logFollowedUser(
    userId: string,
    followedUserId: string,
    followedUserName: string,
  ): Promise<void> {
    await this.createActivity(
      userId,
      ActivityType.FOLLOWED_USER,
      { followedUserId, followedUserName },
      followedUserId,
      'user',
    );
  }
}
