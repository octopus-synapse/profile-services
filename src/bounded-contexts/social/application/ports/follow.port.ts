/**
 * Follow Port
 *
 * Defines domain types and repository abstraction for follow operations.
 */

// ============================================================================
// Domain Types
// ============================================================================

export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type FollowWithUser = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower?: {
    id: string;
    name: string | null;
    username: string | null;
    photoURL: string | null;
  };
  following?: {
    id: string;
    name: string | null;
    username: string | null;
    photoURL: string | null;
  };
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
  ): Promise<{ data: FollowWithUser[]; total: number }>;

  abstract findFollowing(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: FollowWithUser[]; total: number }>;

  abstract countFollowers(userId: string): Promise<number>;

  abstract countFollowing(userId: string): Promise<number>;

  abstract findFollowingIds(userId: string): Promise<string[]>;

  abstract findFollowerIds(userId: string): Promise<string[]>;

  abstract userExists(userId: string): Promise<boolean>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const FOLLOW_USE_CASES = Symbol('FOLLOW_USE_CASES');

export interface FollowUseCases {
  followUserUseCase: {
    execute: (followerId: string, followingId: string) => Promise<FollowWithUser>;
  };
  unfollowUserUseCase: {
    execute: (followerId: string, followingId: string) => Promise<void>;
  };
  checkFollowingUseCase: {
    execute: (followerId: string, followingId: string) => Promise<boolean>;
  };
  getFollowersUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<PaginatedResult<FollowWithUser>>;
  };
  getFollowingUseCase: {
    execute: (
      userId: string,
      pagination: PaginationParams,
    ) => Promise<PaginatedResult<FollowWithUser>>;
  };
  getSocialStatsUseCase: {
    execute: (userId: string) => Promise<{ followers: number; following: number }>;
  };
  getFollowingIdsUseCase: {
    execute: (userId: string) => Promise<string[]>;
  };
}
