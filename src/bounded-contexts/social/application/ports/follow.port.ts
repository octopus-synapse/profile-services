/**
 * Follow Port
 *
 * Defines domain types and repository abstraction for follow operations.
 */

import type { PaginatedResponse } from '@/shared-kernel/schemas/common/api.types';

// ============================================================================
// Domain Types
// ============================================================================

export type PaginationParams = { page: number; limit: number };

/**
 * Re-export of the canonical paginated response shape to keep the port
 * surface stable. Use `PaginatedResponse<T>` from shared-kernel directly
 * in new code; this alias exists for the social BC migration only and
 * is scheduled for deletion once all consumers stop importing it.
 */
export type PaginatedResult<T> = PaginatedResponse<T>;

export type FollowWithUser = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower?: { id: string; name: string | null; username: string | null; photoURL: string | null };
  following?: { id: string; name: string | null; username: string | null; photoURL: string | null };
  /**
   * Present when the list is fetched by an authenticated viewer — indicates
   * whether the viewer is currently following the person on this row.
   */
  isFollowedByMe?: boolean;
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class FollowRepositoryPort {
  abstract createFollow(followerId: string, followingId: string): Promise<FollowWithUser>;

  abstract deleteFollow(followerId: string, followingId: string): Promise<void>;

  abstract findFollow(followerId: string, followingId: string): Promise<FollowWithUser | null>;

  abstract findFollowers(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ items: FollowWithUser[]; total: number }>;

  abstract findFollowing(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ items: FollowWithUser[]; total: number }>;

  abstract countFollowers(userId: string): Promise<number>;

  abstract countFollowing(userId: string): Promise<number>;

  abstract findFollowingIds(userId: string): Promise<string[]>;

  abstract findFollowerIds(userId: string): Promise<string[]>;

  abstract userExists(userId: string): Promise<boolean>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class FollowUseCases {
  abstract readonly followUserUseCase: {
    execute: (followerId: string, followingId: string) => Promise<FollowWithUser>;
  };
  abstract readonly unfollowUserUseCase: {
    execute: (followerId: string, followingId: string) => Promise<void>;
  };
  abstract readonly checkFollowingUseCase: {
    execute: (followerId: string, followingId: string) => Promise<boolean>;
  };
  abstract readonly getFollowersUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<PaginatedResult<FollowWithUser>>;
  };
  abstract readonly getFollowingUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<PaginatedResult<FollowWithUser>>;
  };
  abstract readonly getSocialStatsUseCase: {
    execute: (userId: string) => Promise<{ followers: number; following: number }>;
  };
  abstract readonly getFollowingIdsUseCase: { execute: (userId: string) => Promise<string[]> };
}
