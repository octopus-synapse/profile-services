/**
 * Follow Service
 *
 * Handles follow/unfollow operations between users.
 * Implements social networking features.
 *
 * Kent Beck: "Make it work, make it right, make it fast."
 */

import { Injectable } from '@nestjs/common';
import {
  UserNotFoundError,
  BusinessRuleError,
  DuplicateResourceError,
} from '@octopus-synapse/profile-contracts';
import { SocialRepository } from '../repositories/social.repository';
import { AppLoggerService } from '../../common/logger/logger.service';

// --- Types ---

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FollowWithUser {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower?: {
    id: string;
    name: string | null;
    username: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
  following?: {
    id: string;
    name: string | null;
    username: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
}

// --- Service ---

@Injectable()
export class FollowService {
  constructor(
    private readonly repository: SocialRepository,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Follow a user.
   * Creates a follow relationship between follower and following.
   */
  async follow(
    followerId: string,
    followingId: string,
  ): Promise<FollowWithUser> {
    // Cannot follow yourself
    if (followerId === followingId) {
      throw new BusinessRuleError('Cannot follow yourself', {
        userId: followerId,
      });
    }

    // Check if target user exists
    const targetUser = await this.repository.findUserById(followingId);

    if (!targetUser) {
      throw new UserNotFoundError(followingId);
    }

    // Check if already following
    const existingFollow = await this.repository.findFollow(
      followerId,
      followingId,
    );

    if (existingFollow) {
      throw new DuplicateResourceError(
        'Follow',
        'relationship',
        `${followerId}->${followingId}`,
      );
    }

    // Create follow relationship
    const follow = await this.repository.createFollow(followerId, followingId);

    this.logger.debug(
      `User ${followerId} followed ${followingId}`,
      'FollowService',
    );

    return follow;
  }

  /**
   * Unfollow a user.
   * Removes the follow relationship.
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.repository.deleteFollow(followerId, followingId);

    this.logger.debug(
      `User ${followerId} unfollowed ${followingId}`,
      'FollowService',
    );
  }

  /**
   * Check if a user is following another user.
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.repository.findFollow(followerId, followingId);

    return follow !== null;
  }

  /**
   * Get paginated list of followers for a user.
   */
  async getFollowers(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FollowWithUser>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.repository.findFollowersWithPagination(userId, {
        skip,
        take: limit,
      }),
      this.repository.countFollowers(userId),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get paginated list of users that a user is following.
   */
  async getFollowing(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FollowWithUser>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.repository.findFollowingWithPagination(userId, {
        skip,
        take: limit,
      }),
      this.repository.countFollowing(userId),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get count of followers for a user.
   */
  async getFollowersCount(userId: string): Promise<number> {
    return this.repository.countFollowers(userId);
  }

  /**
   * Get count of users that a user is following.
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.repository.countFollowing(userId);
  }

  /**
   * Get array of user IDs that a user is following.
   * Useful for building activity feeds.
   */
  async getFollowingIds(userId: string): Promise<string[]> {
    const following = await this.repository.findFollowingIds(userId);

    return following.map((f) => f.followingId);
  }

  /**
   * Get social stats for a user.
   */
  async getSocialStats(
    userId: string,
  ): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      this.getFollowersCount(userId),
      this.getFollowingCount(userId),
    ]);

    return { followers, following };
  }
}
