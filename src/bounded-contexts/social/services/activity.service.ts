/**
 * Activity Service
 *
 * Handles user activity tracking and feed generation. Delegates persistence
 * to ActivityRepositoryPort and follower lookup to FollowRepositoryPort.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import {
  ActivityRepositoryPort,
  type ActivityType,
  type ActivityWithUser,
} from '../application/ports/activity.port';
import {
  ActivityCreatorPort,
  ActivityLoggerPort,
  ActivityReaderPort,
} from '../application/ports/facade.ports';
import { FollowRepositoryPort } from '../application/ports/follow.port';
import {
  SOCIAL_EVENT_BUS_PORT,
  SocialEventBusPort,
} from '../application/ports/social-event-bus.port';
import {
  SOCIAL_LOGGER_PORT,
  SocialLoggerPort,
} from '../application/ports/social-logger.port';
import { ActivityCreatedEvent, type SocialActivityType } from '../domain/events';
import type { PaginatedResult, PaginationParams } from './follow.service';

export type { ActivityWithUser };

@Injectable()
export class ActivityService
  extends ActivityCreatorPort
  implements ActivityReaderPort, ActivityLoggerPort
{
  constructor(
    private readonly activityRepo: ActivityRepositoryPort,
    private readonly followRepo: FollowRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    @Inject(SOCIAL_LOGGER_PORT)
    private readonly logger: SocialLoggerPort,
    @Inject(SOCIAL_EVENT_BUS_PORT)
    private readonly eventBus: SocialEventBusPort,
  ) {
    super();
  }

  async createActivity(
    userId: string,
    type: ActivityType,
    metadata?: unknown,
    entityId?: string,
    entityType?: string,
  ): Promise<ActivityWithUser> {
    const activity = await this.activityRepo.createActivity({
      userId,
      type,
      metadata: metadata ?? undefined,
      entityId,
      entityType,
    });

    this.eventPublisher.publish(
      new ActivityCreatedEvent(activity.id, {
        userId,
        activityType: this.mapActivityType(type),
        targetId: entityId ?? activity.id,
      }),
    );

    const activityWithUser = await this.activityRepo.findActivityWithUser(activity.id);

    const followerIds = await this.followRepo.findFollowerIds(userId);
    for (const followerId of followerIds) {
      this.eventBus.emit(`feed:user:${followerId}`, activityWithUser);
    }

    this.logger.debug(
      `Created activity ${type} for user ${userId}, emitted to ${followerIds.length} followers`,
      'ActivityService',
    );

    return activity;
  }

  private mapActivityType(prismaType: ActivityType): SocialActivityType {
    const mapping: Record<ActivityType, SocialActivityType> = {
      RESUME_CREATED: 'resume_created',
      RESUME_UPDATED: 'resume_created',
      RESUME_SHARED: 'resume_published',
      RESUME_PUBLISHED: 'resume_published',
      THEME_PUBLISHED: 'resume_published',
      ACHIEVEMENT_EARNED: 'section_item_added',
      SKILL_ADDED: 'section_item_added',
      PROFILE_UPDATED: 'resume_created',
      FOLLOWED_USER: 'user_followed',
      CONNECTED_USER: 'user_followed',
    };
    return mapping[prismaType];
  }

  async getFeed(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;

    const followingIds = await this.followRepo.findFollowingIds(userId);

    if (followingIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const { data, total } = await this.activityRepo.findActivitiesByUserIds(
      followingIds,
      pagination,
    );

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserActivities(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;
    const { data, total } = await this.activityRepo.findUserActivities(userId, pagination);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getActivitiesByType(
    userId: string,
    type: ActivityType,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>> {
    const { page, limit } = pagination;
    const { data, total } = await this.activityRepo.findUserActivitiesByType(
      userId,
      type,
      pagination,
    );
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteOldActivities(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const count = await this.activityRepo.deleteOlderThan(cutoffDate);

    this.logger.log(
      `Deleted ${count} activities older than ${days} days`,
      'ActivityService',
    );

    return count;
  }

  async logFollowedUser(
    userId: string,
    followedUserId: string,
    followedUserName: string,
  ): Promise<void> {
    await this.createActivity(
      userId,
      'FOLLOWED_USER',
      { followedUserId, followedUserName },
      followedUserId,
      'user',
    );
  }
}
