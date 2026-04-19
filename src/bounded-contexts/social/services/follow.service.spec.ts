/**
 * FollowService Tests
 *
 * Uses port-level in-memory fakes. No Prisma mocking.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import {
  InMemoryConnectionRepository,
  InMemoryFollowRepository,
  InMemorySocialLogger,
} from '../testing';
import { FollowService } from './follow.service';

describe('FollowService', () => {
  let service: FollowService;
  let followRepo: InMemoryFollowRepository;
  let connectionRepo: InMemoryConnectionRepository;
  let eventPublisher: EventPublisherPort;
  const publishedEvents: DomainEvent<unknown>[] = [];

  beforeEach(() => {
    followRepo = new InMemoryFollowRepository();
    connectionRepo = new InMemoryConnectionRepository();
    publishedEvents.length = 0;
    eventPublisher = {
      publish: mock(<T>(event: DomainEvent<T>) => {
        publishedEvents.push(event);
      }),
      publishAsync: mock(async <T>(event: DomainEvent<T>) => {
        publishedEvents.push(event);
      }),
    };
    service = new FollowService(
      followRepo,
      connectionRepo,
      eventPublisher,
      new InMemorySocialLogger(),
    );
  });

  describe('follow', () => {
    it('should create a follow relationship', async () => {
      followRepo.seedUser({ id: 'user-2', name: 'Two', username: 'two', photoURL: null });

      const result = await service.follow('user-1', 'user-2');

      expect(result).toHaveProperty('id');
      expect(result.followerId).toBe('user-1');
      expect(result.followingId).toBe('user-2');
    });

    it('should throw ValidationException when trying to follow yourself', async () => {
      await expect(service.follow('user-1', 'user-1')).rejects.toThrow(ValidationException);
    });

    it('should throw ConflictException when already following', async () => {
      followRepo.seedUser({ id: 'user-2', name: 'Two', username: 'two', photoURL: null });
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-2' });

      await expect(service.follow('user-1', 'user-2')).rejects.toThrow(ConflictException);
    });

    it('should throw EntityNotFoundException when target user does not exist', async () => {
      await expect(service.follow('user-1', 'nonexistent')).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('unfollow', () => {
    it('should remove follow relationship', async () => {
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-2' });

      await service.unfollow('user-1', 'user-2');

      expect(followRepo.getAll()).toHaveLength(0);
    });

    it('should not throw when not following', async () => {
      const result = await service.unfollow('user-1', 'user-2');
      expect(result).toBeUndefined();
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-2' });

      expect(await service.isFollowing('user-1', 'user-2')).toBe(true);
    });

    it('should return false when not following', async () => {
      expect(await service.isFollowing('user-1', 'user-2')).toBe(false);
    });
  });

  describe('getFollowers', () => {
    it('should return paginated list of followers', async () => {
      followRepo.seedFollow({ followerId: 'user-2', followingId: 'user-1' });
      followRepo.seedFollow({ followerId: 'user-3', followingId: 'user-1' });

      const result = await service.getFollowers('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getFollowing', () => {
    it('should return paginated list of following users', async () => {
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-2' });

      const result = await service.getFollowing('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getFollowersCount', () => {
    it('should return count of followers', async () => {
      for (let i = 0; i < 5; i++) {
        followRepo.seedFollow({ followerId: `u-${i}`, followingId: 'user-1' });
      }

      expect(await service.getFollowersCount('user-1')).toBe(5);
    });
  });

  describe('getFollowingCount', () => {
    it('should return count of following', async () => {
      for (let i = 0; i < 3; i++) {
        followRepo.seedFollow({ followerId: 'user-1', followingId: `u-${i}` });
      }

      expect(await service.getFollowingCount('user-1')).toBe(3);
    });
  });

  describe('getFollowingIds', () => {
    it('should return array of followed user IDs', async () => {
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-2' });
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-3' });

      const result = await service.getFollowingIds('user-1');

      expect(result).toEqual(['user-2', 'user-3']);
    });
  });

  describe('getSocialStats', () => {
    it('should aggregate followers, following and connections', async () => {
      followRepo.seedFollow({ followerId: 'user-2', followingId: 'user-1' });
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-3' });
      connectionRepo.seedConnection({
        requesterId: 'user-1',
        targetId: 'user-4',
        status: 'ACCEPTED',
      });

      const stats = await service.getSocialStats('user-1');

      expect(stats).toEqual({ followers: 1, following: 1, connections: 1 });
    });
  });
});
