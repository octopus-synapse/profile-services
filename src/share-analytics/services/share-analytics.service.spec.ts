/**
 * ShareAnalyticsService Unit Tests
 *
 * Tests share analytics functionality:
 * - Event tracking (VIEW, DOWNLOAD)
 * - IP anonymization (GDPR)
 * - Analytics aggregation
 * - Geo tracking
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ShareAnalyticsService } from './share-analytics.service';
import { ShareAnalyticsRepository } from '../repositories';
import { ResourceOwnershipError } from '@octopus-synapse/profile-contracts';

describe('ShareAnalyticsService', () => {
  let service: ShareAnalyticsService;
  let repository: ShareAnalyticsRepository;

  const mockAnalyticsEvent = {
    id: 'event-123',
    shareId: 'share-123',
    event: 'VIEW' as const,
    ipHash: 'a1b2c3d4e5f6',
    userAgent: 'Mozilla/5.0',
    referer: 'https://linkedin.com',
    country: 'BR',
    city: 'São Paulo',
    createdAt: new Date(),
  };

  const mockShare = {
    id: 'share-123',
    resumeId: 'resume-123',
    slug: 'my-resume',
    resume: { userId: 'user-123' },
  };

  beforeEach(async () => {
    repository = {
      createEvent: mock(() => Promise.resolve(mockAnalyticsEvent)),
      getEventCounts: mock(() => Promise.resolve([])),
      findEvents: mock(() => Promise.resolve([mockAnalyticsEvent])),
      findShareWithOwner: mock(() => Promise.resolve(mockShare)),
      getUniqueViews: mock(() => Promise.resolve([])),
      getByCountry: mock(() => Promise.resolve([])),
      getRecentEvents: mock(() => Promise.resolve([])),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareAnalyticsService,
        { provide: ShareAnalyticsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<ShareAnalyticsService>(ShareAnalyticsService);
  });

  describe('Event Tracking', () => {
    it('should track VIEW event', async () => {
      const result = await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referer: 'https://linkedin.com',
      });

      expect(result).toEqual(mockAnalyticsEvent);
      expect(repository.createEvent).toHaveBeenCalled();
    });

    it('should track DOWNLOAD event', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'DOWNLOAD',
        ip: '192.168.1.1',
      });

      expect(repository.createEvent).toHaveBeenCalled();
    });

    it('should include user agent when provided', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
        userAgent: 'Chrome/120.0',
      });

      expect(repository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'Chrome/120.0',
        }),
      );
    });

    it('should include referer when provided', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
        referer: 'https://google.com',
      });

      expect(repository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          referer: 'https://google.com',
        }),
      );
    });

    it('should include geo data when provided', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
        country: 'US',
        city: 'New York',
      });

      expect(repository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'US',
          city: 'New York',
        }),
      );
    });
  });

  describe('IP Anonymization (GDPR)', () => {
    it('should hash IP address with SHA-256', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      expect(repository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ipHash: expect.any(String),
        }),
      );
    });

    it('should generate different hashes for different IPs', async () => {
      const calls: any[] = [];
      repository.createEvent = mock((data) => {
        calls.push(data);
        return Promise.resolve(mockAnalyticsEvent);
      }) as any;

      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.2',
      });

      expect(calls[0].ipHash).not.toBe(calls[1].ipHash);
    });

    it('should generate same hash for same IP (unique visitor tracking)', async () => {
      const calls: any[] = [];
      repository.createEvent = mock((data) => {
        calls.push(data);
        return Promise.resolve(mockAnalyticsEvent);
      }) as any;

      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      expect(calls[0].ipHash).toBe(calls[1].ipHash);
    });
  });

  describe('Analytics Retrieval', () => {
    it('should get analytics for share owner', async () => {
      repository.getEventCounts = mock(() =>
        Promise.resolve([
          { event: 'VIEW', _count: { event: 10 } },
          { event: 'DOWNLOAD', _count: { event: 5 } },
        ] as any),
      ) as any;

      const result = await service.getAnalytics('share-123', 'user-123');

      expect(result.totalViews).toBe(10);
      expect(result.totalDownloads).toBe(5);
    });

    it('should throw ResourceOwnershipError when share not found', async () => {
      repository.findShareWithOwner = mock(() => Promise.resolve(null)) as any;

      await expect(
        service.getAnalytics('share-123', 'user-123'),
      ).rejects.toThrow(ResourceOwnershipError);
    });

    it('should throw ResourceOwnershipError when user does not own resume', async () => {
      repository.findShareWithOwner = mock(() =>
        Promise.resolve({
          ...mockShare,
          resume: { userId: 'other-user' },
        }),
      ) as any;

      await expect(
        service.getAnalytics('share-123', 'user-123'),
      ).rejects.toThrow(ResourceOwnershipError);
    });

    it('should calculate unique views from unique IP hashes', async () => {
      repository.getUniqueViews = mock(() =>
        Promise.resolve([
          { ipHash: 'hash1', _count: { ipHash: 3 } },
          { ipHash: 'hash2', _count: { ipHash: 2 } },
          { ipHash: 'hash3', _count: { ipHash: 1 } },
        ] as any),
      ) as any;

      const result = await service.getAnalytics('share-123', 'user-123');

      expect(result.uniqueVisitors).toBe(3);
    });

    it('should group analytics by country', async () => {
      repository.getByCountry = mock(() =>
        Promise.resolve([
          { country: 'BR', _count: { country: 10 } },
          { country: 'US', _count: { country: 5 } },
        ] as any),
      );

      const result = await service.getAnalytics('share-123', 'user-123');

      expect(result.byCountry).toEqual([
        { country: 'BR', count: 10 },
        { country: 'US', count: 5 },
      ]);
    });

    it('should return recent events', async () => {
      const result = await service.getAnalytics('share-123', 'user-123');

      expect(result.recentEvents).toBeDefined();
      expect(repository.getRecentEvents).toHaveBeenCalledWith('share-123');
    });

    it('should return 0 views when no events', async () => {
      repository.getEventCounts = mock(() => Promise.resolve([])) as any;
      repository.getUniqueViews = mock(() => Promise.resolve([])) as any;

      const result = await service.getAnalytics('share-123', 'user-123');

      expect(result.totalViews).toBe(0);
      expect(result.totalDownloads).toBe(0);
      expect(result.uniqueVisitors).toBe(0);
    });
  });
});
