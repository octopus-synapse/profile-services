/**
 * Follow Service
 *
 * Handles follow/unfollow operations between users.
 * Delegates persistence to FollowRepositoryPort and ConnectionRepositoryPort.
 */

import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import { ConnectionRepositoryPort } from '../application/ports/connection.port';
import { FollowReaderPort } from '../application/ports/facade.ports';
import {
  FollowRepositoryPort,
  type FollowWithUser,
  type PaginatedResult,
  type PaginationParams,
} from '../application/ports/follow.port';
import { UserFollowedEvent } from '../domain/events';
import {
  AlreadyFollowingException,
  CannotFollowSelfException,
} from '../domain/exceptions/social.exceptions';

export type { FollowWithUser, PaginatedResult, PaginationParams };

export class FollowService extends FollowReaderPort {
  constructor(
    private readonly followRepo: FollowRepositoryPort,
    private readonly connectionRepo: ConnectionRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async follow(followerId: string, followingId: string): Promise<FollowWithUser> {
    if (followerId === followingId) {
      throw new CannotFollowSelfException();
    }

    const targetExists = await this.followRepo.userExists(followingId);
    if (!targetExists) {
      throw new EntityNotFoundException('User');
    }

    const existingFollow = await this.followRepo.findFollow(followerId, followingId);
    if (existingFollow) {
      throw new AlreadyFollowingException();
    }

    const follow = await this.followRepo.createFollow(followerId, followingId);

    this.eventPublisher.publish(new UserFollowedEvent(followingId, { followerId }));

    this.logger.debug(`User ${followerId} followed ${followingId}`, 'FollowService');

    return follow;
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const existing = await this.followRepo.findFollow(followerId, followingId);
    if (!existing) throw new EntityNotFoundException('Follow', followingId);
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
    viewerId?: string,
  ): Promise<PaginatedResult<FollowWithUser>> {
    const { items, total } = await this.followRepo.findFollowers(userId, pagination);
    const enriched = await this.enrichWithViewerRelationship(items, viewerId, 'follower');
    return buildPaginatedResponse(enriched, total, pagination);
  }

  async getFollowing(
    userId: string,
    pagination: PaginationParams,
    viewerId?: string,
  ): Promise<PaginatedResult<FollowWithUser>> {
    const { items, total } = await this.followRepo.findFollowing(userId, pagination);
    const enriched = await this.enrichWithViewerRelationship(items, viewerId, 'following');
    return buildPaginatedResponse(enriched, total, pagination);
  }

  private async enrichWithViewerRelationship(
    rows: FollowWithUser[],
    viewerId: string | undefined,
    edge: 'follower' | 'following',
  ): Promise<FollowWithUser[]> {
    if (!viewerId || rows.length === 0) return rows;
    const viewerFollowingIds = new Set(await this.followRepo.findFollowingIds(viewerId));
    return rows.map((row) => {
      const targetId = edge === 'follower' ? row.follower?.id : row.following?.id;
      const isSelf = targetId === viewerId;
      return {
        ...row,
        isFollowedByMe: isSelf ? false : targetId ? viewerFollowingIds.has(targetId) : false,
      };
    });
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
