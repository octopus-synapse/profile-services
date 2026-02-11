/**
 * Follow Service
 *
 * Handles follow/unfollow operations between users.
 * Implements social networking features.
 *
 * Kent Beck: "Make it work, make it right, make it fast."
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import { UserFollowedEvent } from '../../domain/events';

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
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Follow a user.
   * Creates a follow relationship between follower and following.
   */
  async follow(followerId: string, followingId: string): Promise<FollowWithUser> {
    // Cannot follow yourself
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findFirst({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    // Create follow relationship
    const follow = await this.prisma.follow.create({
      data: { followerId, followingId },
      include: {
        following: {
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

    this.eventPublisher.publish(new UserFollowedEvent(followingId, { followerId }));

    this.logger.debug(`User ${followerId} followed ${followingId}`, 'FollowService');

    return follow;
  }

  /**
   * Unfollow a user.
   * Removes the follow relationship.
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    this.logger.debug(`User ${followerId} unfollowed ${followingId}`, 'FollowService');
  }

  /**
   * Check if a user is following another user.
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findFirst({
      where: { followerId, followingId },
    });

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
      this.prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
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
      this.prisma.follow.count({
        where: { followingId: userId },
      }),
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
      this.prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
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
      this.prisma.follow.count({
        where: { followerId: userId },
      }),
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
    return this.prisma.follow.count({
      where: { followingId: userId },
    });
  }

  /**
   * Get count of users that a user is following.
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.prisma.follow.count({
      where: { followerId: userId },
    });
  }

  /**
   * Get array of user IDs that a user is following.
   * Useful for building activity feeds.
   */
  async getFollowingIds(userId: string): Promise<string[]> {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    return following.map((f) => f.followingId);
  }

  /**
   * Get social stats for a user.
   */
  async getSocialStats(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      this.getFollowersCount(userId),
      this.getFollowingCount(userId),
    ]);

    return { followers, following };
  }
}
