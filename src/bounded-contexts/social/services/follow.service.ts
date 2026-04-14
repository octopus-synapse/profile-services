/**
 * Follow Service
 *
 * Handles follow/unfollow operations between users.
 * Delegates persistence to FollowRepositoryPort and ConnectionRepositoryPort.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { ConnectionRepositoryPort } from '../application/ports/connection.port';
import { FollowReaderPort } from '../application/ports/facade.ports';
import {
  FollowRepositoryPort,
  type FollowWithUser,
  type PaginatedResult,
  type PaginationParams,
} from '../application/ports/follow.port';
import {
  SOCIAL_LOGGER_PORT,
  SocialLoggerPort,
} from '../application/ports/social-logger.port';
import { UserFollowedEvent } from '../domain/events';

export type { FollowWithUser, PaginatedResult, PaginationParams };

@Injectable()
export class FollowService extends FollowReaderPort {
  constructor(
    private readonly followRepo: FollowRepositoryPort,
    private readonly connectionRepo: ConnectionRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    @Inject(SOCIAL_LOGGER_PORT)
    private readonly logger: SocialLoggerPort,
  ) {
    super();
  }

  async follow(followerId: string, followingId: string): Promise<FollowWithUser> {
    if (followerId === followingId) {
      throw new ValidationException('Cannot follow yourself');
    }

    const targetExists = await this.followRepo.userExists(followingId);
    if (!targetExists) {
      throw new EntityNotFoundException('User');
    }

    const existingFollow = await this.followRepo.findFollow(followerId, followingId);
    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    const follow = await this.followRepo.createFollow(followerId, followingId);

    this.eventPublisher.publish(new UserFollowedEvent(followingId, { followerId }));

    this.logger.debug(`User ${followerId} followed ${followingId}`, 'FollowService');

    return follow;
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.followRepo.deleteFollow(followerId, followingId);
    this.logger.debug(`User ${followerId} unfollowed ${followingId}`, 'FollowService');
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followRepo.findFollow(followerId, followingId);
    return follow !== null;
  }

  async getFollowers(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FollowWithUser>> {
    const { page, limit } = pagination;
    const { data, total } = await this.followRepo.findFollowers(userId, pagination);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFollowing(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FollowWithUser>> {
    const { page, limit } = pagination;
    const { data, total } = await this.followRepo.findFollowing(userId, pagination);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFollowersCount(userId: string): Promise<number> {
    return this.followRepo.countFollowers(userId);
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.followRepo.countFollowing(userId);
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    return this.followRepo.findFollowingIds(userId);
  }

  async getSocialStats(
    userId: string,
  ): Promise<{ followers: number; following: number; connections: number }> {
    const [followers, following, connections] = await Promise.all([
      this.followRepo.countFollowers(userId),
      this.followRepo.countFollowing(userId),
      this.connectionRepo.countAcceptedConnections(userId),
    ]);

    return { followers, following, connections };
  }
}
