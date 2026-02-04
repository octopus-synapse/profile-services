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
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('ShareAnalyticsService', () => {
  let service: ShareAnalyticsService;
  let prisma: PrismaService;

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
    prisma = {
      shareAnalytics: {
        create: mock(() => Promise.resolve(mockAnalyticsEvent)),
        groupBy: mock(() => Promise.resolve([])),
        findMany: mock(() => Promise.resolve([mockAnalyticsEvent])),
      },
      resumeShare: {
        findUnique: mock(() => Promise.resolve(mockShare)),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareAnalyticsService,
        { provide: PrismaService, useValue: prisma },
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
      expect(prisma.shareAnalytics.create).toHaveBeenCalled();
    });

    it('should track DOWNLOAD event', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'DOWNLOAD',
        ip: '192.168.1.1',
      });

      expect(prisma.shareAnalytics.create).toHaveBeenCalled();
    });

    it('should include user agent when provided', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
        userAgent: 'Chrome/120.0',
      });

      expect(prisma.shareAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: 'Chrome/120.0',
        }),
      });
    });

    it('should include referer when provided', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
        referer: 'https://google.com',
      });

      expect(prisma.shareAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referer: 'https://google.com',
        }),
      });
    });

    it('should include geo data when provided', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
        country: 'US',
        city: 'New York',
      });

      expect(prisma.shareAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          country: 'US',
          city: 'New York',
        }),
      });
    });
  });

  describe('IP Anonymization (GDPR)', () => {
    it('should hash IP address with SHA-256', async () => {
      await service.trackEvent({
        shareId: 'share-123',
        event: 'VIEW',
        ip: '192.168.1.1',
      });

      expect(prisma.shareAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipHash: expect.any(String),
        }),
      });
    });

    it('should generate different hashes for different IPs', async () => {
      const calls: any[] = [];
      prisma.shareAnalytics.create = mock((data) => {
        calls.push(data);
        return Promise.resolve(mockAnalyticsEvent);
      });

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

      expect(calls[0].data.ipHash).not.toBe(calls[1].data.ipHash);
    });

    it('should generate same hash for same IP (unique visitor tracking)', async () => {
      const calls: any[] = [];
      prisma.shareAnalytics.create = mock((data) => {
        calls.push(data);
        return Promise.resolve(mockAnalyticsEvent);
      });

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

      expect(calls[0].data.ipHash).toBe(calls[1].data.ipHash);
    });
  });

  describe('Analytics Retrieval', () => {
    it('should get analytics for share owner', async () => {
      prisma.shareAnalytics.groupBy = mock(() =>
        Promise.resolve([
          { event: 'VIEW', _count: { event: 10 } },
          { event: 'DOWNLOAD', _count: { event: 5 } },
        ] as any),
      );

      const result = await service.getAnalytics('share-123', 'user-123');

      expect(result.totalViews).toBe(10);
      expect(result.totalDownloads).toBe(5);
    });

    it('should throw ForbiddenException when share not found', async () => {
      prisma.resumeShare.findUnique = mock(() => Promise.resolve(null));

      await expect(
        service.getAnalytics('share-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      prisma.resumeShare.findUnique = mock(() =>
        Promise.resolve({
          ...mockShare,
          resume: { userId: 'other-user' },
        }),
      );

      await expect(
        service.getAnalytics('share-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should calculate unique views from unique IP hashes', async () => {
      prisma.shareAnalytics.groupBy = mock(() =>
        Promise.resolve([
          { ipHash: 'hash1', _count: { ipHash: 3 } },
          { ipHash: 'hash2', _count: { ipHash: 2 } },
          { ipHash: 'hash3', _count: { ipHash: 1 } },
        ] as any),
      );

      const result = await service.getAnalytics('share-123', 'user-123');

      expect(result.uniqueVisitors).toBe(3);
    });

    it('should group analytics by country', async () => {
      prisma.shareAnalytics.groupBy = mock(() =>
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

      expect(result.recentEvents).toEqual([mockAnalyticsEvent]);
      expect(prisma.shareAnalytics.findMany).toHaveBeenCalledWith({
        where: { shareId: 'share-123' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          event: true,
          country: true,
          city: true,
          createdAt: true,
        },
      });
    });

    it('should return 0 views when no events', async () => {
      prisma.shareAnalytics.groupBy = mock(() => Promise.resolve([]));

      const result = await service.getAnalytics('share-123', 'user-123');

      expect(result.totalViews).toBe(0);
      expect(result.totalDownloads).toBe(0);
      expect(result.uniqueVisitors).toBe(0);
    });
  });
});
