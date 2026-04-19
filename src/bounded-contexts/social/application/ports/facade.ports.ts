/**
 * Facade Ports
 *
 * Contracts exposed by services so that controllers and handlers depend on
 * abstractions rather than on concrete service classes.
 */

import type { ActivityType, ActivityWithUser } from './activity.port';
import type { ConnectionUser, ConnectionWithUser } from './connection.port';
import type { FollowWithUser, PaginatedResult, PaginationParams } from './follow.port';

export abstract class ActivityCreatorPort {
  abstract createActivity(
    userId: string,
    type: ActivityType,
    metadata?: unknown,
    entityId?: string,
    entityType?: string,
  ): Promise<ActivityWithUser>;
}

export abstract class ActivityReaderPort {
  abstract getFeed(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>>;

  abstract getUserActivities(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>>;

  abstract getActivitiesByType(
    userId: string,
    type: ActivityType,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityWithUser>>;
}

export abstract class ActivityLoggerPort {
  abstract logFollowedUser(
    userId: string,
    followedUserId: string,
    followedUserName: string,
  ): Promise<void>;
}

export abstract class FollowReaderPort {
  abstract follow(followerId: string, followingId: string): Promise<FollowWithUser>;
  abstract unfollow(followerId: string, followingId: string): Promise<void>;
  abstract isFollowing(followerId: string, followingId: string): Promise<boolean>;
  abstract getFollowers(
    userId: string,
    pagination: PaginationParams,
    viewerId?: string,
  ): Promise<PaginatedResult<FollowWithUser>>;
  abstract getFollowing(
    userId: string,
    pagination: PaginationParams,
    viewerId?: string,
  ): Promise<PaginatedResult<FollowWithUser>>;
  abstract getSocialStats(
    userId: string,
  ): Promise<{ followers: number; following: number; connections: number }>;
}

export abstract class ConnectionReaderPort {
  abstract getPendingRequests(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ConnectionWithUser & { user?: ConnectionUser }>>;
}
