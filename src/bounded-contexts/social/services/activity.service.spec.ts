/**
 * ActivityService Tests — using port-level in-memory fakes.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { ActivityType } from '../application/ports/activity.port';
import {
  InMemoryActivityRepository,
  InMemoryFollowRepository,
  InMemorySocialEventBus,
  InMemorySocialLogger,
} from '../testing';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let activityRepo: InMemoryActivityRepository;
  let followRepo: InMemoryFollowRepository;
  let eventBus: InMemorySocialEventBus;
  let eventPublisher: EventPublisherPort;

  beforeEach(() => {
    activityRepo = new InMemoryActivityRepository();
    followRepo = new InMemoryFollowRepository();
    eventBus = new InMemorySocialEventBus();
    eventPublisher = {
      publish: mock(<T>(_event: DomainEvent<T>) => {}),
      publishAsync: mock(async <T>(_event: DomainEvent<T>) => {}),
    };
    service = new ActivityService(
      activityRepo,
      followRepo,
      eventPublisher,
      new InMemorySocialLogger(),
      eventBus,
    );
  });

  describe('createActivity', () => {
    it('should create an activity record', async () => {
      const metadata = { resumeId: 'res-1', title: 'My Resume' };

      const result = await service.createActivity('user-1', ActivityType.RESUME_CREATED, metadata);

      expect(result.userId).toBe('user-1');
      expect(result.type).toBe(ActivityType.RESUME_CREATED);
      expect(activityRepo.getAll()).toHaveLength(1);
    });

    it('should create activity with entityId and entityType', async () => {
      const result = await service.createActivity(
        'user-1',
        ActivityType.RESUME_UPDATED,
        { changes: ['title'] },
        'res-123',
        'resume',
      );

      expect(result.entityId).toBe('res-123');
      expect(result.entityType).toBe('resume');
    });

    it('should emit SSE event to each follower', async () => {
      followRepo.seedFollow({ followerId: 'f-1', followingId: 'user-1' });
      followRepo.seedFollow({ followerId: 'f-2', followingId: 'user-1' });

      await service.createActivity('user-1', ActivityType.RESUME_CREATED);

      expect(eventBus.emitted).toHaveLength(2);
      expect(eventBus.emitted[0].event).toBe('feed:user:f-1');
      expect(eventBus.emitted[1].event).toBe('feed:user:f-2');
    });
  });

  describe('getFeed', () => {
    it('should return activities from followed users', async () => {
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-2' });
      followRepo.seedFollow({ followerId: 'user-1', followingId: 'user-3' });
      activityRepo.seedActivity({ userId: 'user-2', type: ActivityType.RESUME_CREATED });
      activityRepo.seedActivity({ userId: 'user-3', type: ActivityType.SKILL_ADDED });

      const result = await service.getFeed('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return empty feed when not following anyone', async () => {
      const result = await service.getFeed('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getUserActivities', () => {
    it('should return activities for a specific user', async () => {
      activityRepo.seedActivity({ userId: 'user-1', type: ActivityType.RESUME_CREATED });

      const result = await service.getUserActivities('user-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getActivitiesByType', () => {
    it('should filter activities by type', async () => {
      activityRepo.seedActivity({ userId: 'user-1', type: ActivityType.RESUME_CREATED });
      activityRepo.seedActivity({ userId: 'user-1', type: ActivityType.SKILL_ADDED });

      const result = await service.getActivitiesByType(
        'user-1',
        ActivityType.RESUME_CREATED,
        { page: 1, limit: 10 },
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe(ActivityType.RESUME_CREATED);
    });
  });

  describe('deleteOldActivities', () => {
    it('should delete activities older than specified days', async () => {
      const old = new Date();
      old.setDate(old.getDate() - 60);
      activityRepo.seedActivity({
        userId: 'user-1',
        type: ActivityType.RESUME_CREATED,
        createdAt: old,
      });
      activityRepo.seedActivity({ userId: 'user-1', type: ActivityType.RESUME_CREATED });

      const count = await service.deleteOldActivities(30);

      expect(count).toBe(1);
      expect(activityRepo.getAll()).toHaveLength(1);
    });
  });
});
