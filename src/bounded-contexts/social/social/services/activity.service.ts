/**
 * Activity Service
 *
 * Handles user activity tracking and feed generation.
 * Activities are events that users can see in their feed.
 *
 * Kent Beck: "Make it work, make it right, make it fast."
 */

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityType } from '@prisma/client';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import { ActivityCreatedEvent, ActivityType as DomainActivityType } from '../../domain/events';
import { FollowService, PaginatedResult, PaginationParams } from './follow.service';

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
    private readonly prisma: PrismaService,
    private readonly followService: FollowService,
    private readonly logger: AppLoggerService,
    private readonly eventPublisher: EventPublisher,
    private readonly eventEmitter: EventEmitter2,
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
    const activity = await this.prisma.activity.create({
      data: {
        userId,
        type,
        metadata: metadata ?? undefined,
        entityId,
        entityType,
      },
    });

    this.eventPublisher.publish(
      new ActivityCreatedEvent(activity.id, {
        userId,
        activityType: this.mapActivityType(type),
        targetId: entityId ?? activity.id,
      }),
    );

    // Emit SSE event to followers' feeds
    const activityWithUser = await this.prisma.activity.findUnique({
      where: { id: activity.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            displayName: true,
            photoURL: true,
          },
        },
      },
    });

    // Get followers and emit to their feeds
    const followerIds = await this.getFollowerIds(userId);
    for (const followerId of followerIds) {
      this.eventEmitter.emit(`feed:user:${followerId}`, activityWithUser);
    }

    this.logger.debug(
      `Created activity ${type} for user ${userId}, emitted to ${followerIds.length} followers`,
      'ActivityService',
    );

    return activity as ActivityWithUser;
  }

  private mapActivityType(prismaType: ActivityType): DomainActivityType {
    const mapping: Record<ActivityType, DomainActivityType> = {
      RESUME_CREATED: 'resume_created',
      RESUME_UPDATED: 'resume_created',
      RESUME_SHARED: 'resume_published',
      RESUME_PUBLISHED: 'resume_published',
      THEME_PUBLISHED: 'resume_published',
      ACHIEVEMENT_EARNED: 'skill_added',
      SKILL_ADDED: 'skill_added',
      PROFILE_UPDATED: 'resume_created',
      FOLLOWED_USER: 'user_followed',
    };
    return mapping[prismaType];
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
      this.prisma.activity.findMany({
        where: { userId: { in: followingIds } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              displayName: true,
              photoURL: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({
        where: { userId: { in: followingIds } },
      }),
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
      this.prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({
        where: { userId },
      }),
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
      this.prisma.activity.findMany({
        where: { userId, type },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activity.count({
        where: { userId, type },
      }),
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

    const result = await this.prisma.activity.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Deleted ${result.count} activities older than ${days} days`,
      'ActivityService',
    );

    return result.count;
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

  /**
   * Get IDs of users following the given user
   */
  private async getFollowerIds(userId: string): Promise<string[]> {
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });
    return followers.map((f) => f.followerId);
  }
}
