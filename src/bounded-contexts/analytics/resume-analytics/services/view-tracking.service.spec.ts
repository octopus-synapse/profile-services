/**
 * View Tracking Service Tests
 *
 * Tests for resume view tracking and statistics
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ViewTrackingService } from './view-tracking.service';

describe('ViewTrackingService', () => {
  let service: ViewTrackingService;
  let mockPrisma: {
    resumeViewEvent: {
      create: ReturnType<typeof mock>;
      count: ReturnType<typeof mock>;
      groupBy: ReturnType<typeof mock>;
    };
  };
  let mockEventEmitter: {
    emit: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockPrisma = {
      resumeViewEvent: {
        create: mock(() => Promise.resolve({ id: 'view-1' })),
        count: mock(() => Promise.resolve(100)),
        groupBy: mock(() =>
          Promise.resolve([
            { ipHash: 'hash1' },
            { ipHash: 'hash2' },
            { ipHash: 'hash3' },
          ]),
        ),
      },
    };
    mockEventEmitter = {
      emit: mock(() => {}),
    };
    service = new ViewTrackingService(
      mockPrisma as never,
      mockEventEmitter as never,
    );
  });

  describe('trackView', () => {
    const viewInput = {
      resumeId: 'resume-1',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      referer: 'https://linkedin.com/jobs',
      country: 'US',
      city: 'New York',
    };

    it('should create view event with anonymized IP', async () => {
      await service.trackView(viewInput);

      expect(mockPrisma.resumeViewEvent.create).toHaveBeenCalled();
      const createCall = mockPrisma.resumeViewEvent.create.mock.calls[0][0];
      expect(createCall.data.ipHash).not.toBe('192.168.1.1');
      expect(createCall.data.ipHash).toHaveLength(64); // SHA-256 hex
    });

    it('should detect source from referer', async () => {
      await service.trackView(viewInput);

      const createCall = mockPrisma.resumeViewEvent.create.mock.calls[0][0];
      expect(createCall.data.source).toBe('linkedin');
    });

    it('should use direct source when no referer', async () => {
      await service.trackView({
        ...viewInput,
        referer: undefined,
      });

      const createCall = mockPrisma.resumeViewEvent.create.mock.calls[0][0];
      expect(createCall.data.source).toBe('direct');
    });

    it('should detect google source', async () => {
      await service.trackView({
        ...viewInput,
        referer: 'https://www.google.com/search',
      });

      const createCall = mockPrisma.resumeViewEvent.create.mock.calls[0][0];
      expect(createCall.data.source).toBe('google');
    });

    it('should emit SSE event with view count', async () => {
      await service.trackView(viewInput);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'analytics:resume-1:view',
        expect.objectContaining({
          type: 'view',
          resumeId: 'resume-1',
          data: expect.objectContaining({
            views: 100,
          }),
        }),
      );
    });

    it('should store user agent and location', async () => {
      await service.trackView(viewInput);

      const createCall = mockPrisma.resumeViewEvent.create.mock.calls[0][0];
      expect(createCall.data.userAgent).toBe('Mozilla/5.0');
      expect(createCall.data.country).toBe('US');
      expect(createCall.data.city).toBe('New York');
    });
  });

  describe('getViewStats', () => {
    it('should return total views', async () => {
      const result = await service.getViewStats('resume-1', {
        period: 'month',
      });

      expect(result.totalViews).toBe(100);
    });

    it('should return unique visitors count', async () => {
      const result = await service.getViewStats('resume-1', {
        period: 'month',
      });

      expect(result.uniqueVisitors).toBe(3);
    });

    it('should filter by day period', async () => {
      await service.getViewStats('resume-1', { period: 'day' });

      const countCall = mockPrisma.resumeViewEvent.count.mock.calls[0][0];
      const startDate = countCall.where.createdAt.gte;
      const daysDiff = Math.round(
        (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBeLessThanOrEqual(1);
    });

    it('should filter by week period', async () => {
      await service.getViewStats('resume-1', { period: 'week' });

      const countCall = mockPrisma.resumeViewEvent.count.mock.calls[0][0];
      const startDate = countCall.where.createdAt.gte;
      const daysDiff = Math.round(
        (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    it('should filter by month period', async () => {
      await service.getViewStats('resume-1', { period: 'month' });

      const countCall = mockPrisma.resumeViewEvent.count.mock.calls[0][0];
      const startDate = countCall.where.createdAt.gte;
      const daysDiff = Math.round(
        (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBeGreaterThanOrEqual(28);
      expect(daysDiff).toBeLessThanOrEqual(32);
    });

    it('should filter by year period', async () => {
      await service.getViewStats('resume-1', { period: 'year' });

      const countCall = mockPrisma.resumeViewEvent.count.mock.calls[0][0];
      const startDate = countCall.where.createdAt.gte;
      const daysDiff = Math.round(
        (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBeGreaterThanOrEqual(364);
      expect(daysDiff).toBeLessThanOrEqual(366);
    });

    it('should return empty arrays for viewsByDay and topSources', async () => {
      const result = await service.getViewStats('resume-1', {
        period: 'month',
      });

      expect(result.viewsByDay).toEqual([]);
      expect(result.topSources).toEqual([]);
    });
  });
});
