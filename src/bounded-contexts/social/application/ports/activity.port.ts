/**
 * Activity Port
 *
 * Defines domain types and repository abstraction for activity operations.
 */

export const ActivityType = {
  RESUME_CREATED: 'RESUME_CREATED',
  RESUME_UPDATED: 'RESUME_UPDATED',
  RESUME_SHARED: 'RESUME_SHARED',
  RESUME_PUBLISHED: 'RESUME_PUBLISHED',
  THEME_PUBLISHED: 'THEME_PUBLISHED',
  ACHIEVEMENT_EARNED: 'ACHIEVEMENT_EARNED',
  SKILL_ADDED: 'SKILL_ADDED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  FOLLOWED_USER: 'FOLLOWED_USER',
  CONNECTED_USER: 'CONNECTED_USER',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

import type { PaginatedResult, PaginationParams } from './follow.port';

// ============================================================================
// Domain Types
// ============================================================================

export type ActivityWithUser = {
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
    photoURL: string | null;
  };
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class ActivityRepositoryPort {
  abstract createActivity(data: {
    userId: string;
    type: ActivityType;
    metadata?: unknown;
    entityId?: string;
    entityType?: string;
  }): Promise<ActivityWithUser>;

  abstract findActivityWithUser(activityId: string): Promise<ActivityWithUser | null>;

  abstract findActivitiesByUserIds(
    userIds: string[],
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }>;

  abstract findUserActivities(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }>;

  abstract findUserActivitiesByType(
    userId: string,
    type: ActivityType,
    pagination: PaginationParams,
  ): Promise<{ data: ActivityWithUser[]; total: number }>;

  abstract deleteOlderThan(date: Date): Promise<number>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const ACTIVITY_USE_CASES = Symbol('ACTIVITY_USE_CASES');

export interface ActivityUseCases {
  createActivityUseCase: {
    execute: (
      userId: string,
      type: ActivityType,
      metadata?: unknown,
      entityId?: string,
      entityType?: string,
    ) => Promise<ActivityWithUser>;
  };
  getFeedUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<PaginatedResult<ActivityWithUser>>;
  };
  getUserActivitiesUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<PaginatedResult<ActivityWithUser>>;
  };
  getActivitiesByTypeUseCase: {
    execute: (
      userId: string,
      type: ActivityType,
      pagination: PaginationParams,
    ) => Promise<PaginatedResult<ActivityWithUser>>;
  };
  purgeOldActivitiesUseCase: {
    execute: (days: number) => Promise<number>;
  };
}
