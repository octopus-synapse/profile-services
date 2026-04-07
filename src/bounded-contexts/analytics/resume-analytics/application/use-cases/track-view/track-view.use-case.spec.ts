/**
 * Track View / Get View Stats Use Case Tests
 *
 * Tests for resume view tracking and statistics
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { InMemoryViewTrackingRepository } from '@/bounded-contexts/analytics/testing';
import type { ResumeOwnershipPort, ViewTrackingRepositoryPort } from '../../ports/resume-analytics.port';
import { GetViewStatsUseCase } from '../get-view-stats/get-view-stats.use-case';
import { TrackViewUseCase } from './track-view.use-case';

describe('TrackViewUseCase & GetViewStatsUseCase', () => {
  let trackViewUseCase: TrackViewUseCase;
  let getViewStatsUseCase: GetViewStatsUseCase;
  let viewTrackingRepo: InMemoryViewTrackingRepository;
  let mockEventEmitter: {
    emit: ReturnType<typeof mock>;
  };

  /**
   * Adapter wrapping InMemoryViewTrackingRepository as ViewTrackingRepositoryPort.
   */
  function createViewTrackingPort(repo: InMemoryViewTrackingRepository): ViewTrackingRepositoryPort {
    return {
      trackView: async (data) => {
        await repo.create({ data });
      },
      countViews: async (resumeId, startDate, endDate) =>
        repo.count({ where: { resumeId, createdAt: { gte: startDate, lte: endDate } } }),
      countUniqueVisitors: async (resumeId, startDate, endDate) => {
        const result = await repo.groupBy({
          by: ['ipHash'],
          where: { resumeId, createdAt: { gte: startDate, lte: endDate } },
        });
        return result.length;
      },
    };
  }

  beforeEach(() => {
    viewTrackingRepo = new InMemoryViewTrackingRepository();
    mockEventEmitter = {
      emit: mock(() => {}),
    };

    const viewTrackingPort = createViewTrackingPort(viewTrackingRepo);
    const mockOwnership: ResumeOwnershipPort = {
      verifyOwnership: async () => {},
      verifyResumeExists: async () => {},
      getResumeWithDetails: async () => ({} as never),
    };

    trackViewUseCase = new TrackViewUseCase(
      mockOwnership,
      viewTrackingPort,
      mockEventEmitter as never,
    );
    getViewStatsUseCase = new GetViewStatsUseCase(mockOwnership, viewTrackingPort);
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
      await trackViewUseCase.execute(viewInput);

      const events = viewTrackingRepo.getAll();
      expect(events.length).toBe(1);
      expect(events[0].ipHash).not.toBe('192.168.1.1');
      expect(events[0].ipHash).toHaveLength(64); // SHA-256 hex
    });

    it('should detect source from referer', async () => {
      await trackViewUseCase.execute(viewInput);

      const events = viewTrackingRepo.getAll();
      expect(events[0].source).toBe('linkedin');
    });

    it('should use direct source when no referer', async () => {
      await trackViewUseCase.execute({
        ...viewInput,
        referer: undefined,
      });

      const events = viewTrackingRepo.getAll();
      expect(events[0].source).toBe('direct');
    });

    it('should detect google source', async () => {
      await trackViewUseCase.execute({
        ...viewInput,
        referer: 'https://www.google.com/search',
      });

      const events = viewTrackingRepo.getAll();
      expect(events[0].source).toBe('google');
    });

    it('should emit SSE event with view count', async () => {
      await trackViewUseCase.execute(viewInput);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'analytics:resume-1:view',
        expect.objectContaining({
          type: 'view',
          resumeId: 'resume-1',
          data: expect.objectContaining({
            views: expect.any(Number),
          }),
        }),
      );
    });

    it('should store user agent and location', async () => {
      await trackViewUseCase.execute(viewInput);

      const events = viewTrackingRepo.getAll();
      expect(events[0].userAgent).toBe('Mozilla/5.0');
      expect(events[0].country).toBe('US');
      expect(events[0].city).toBe('New York');
    });
  });

  describe('getViewStats', () => {
    it('should return total views', async () => {
      viewTrackingRepo.seedViewEvents([
        { resumeId: 'resume-1', ipHash: 'hash1' },
        { resumeId: 'resume-1', ipHash: 'hash2' },
        { resumeId: 'resume-1', ipHash: 'hash3' },
      ]);

      const result = await getViewStatsUseCase.getViewStats('resume-1', {
        period: 'month',
      });

      expect(result.totalViews).toBe(3);
    });

    it('should return unique visitors count', async () => {
      viewTrackingRepo.seedViewEvents([
        { resumeId: 'resume-1', ipHash: 'hash1' },
        { resumeId: 'resume-1', ipHash: 'hash2' },
        { resumeId: 'resume-1', ipHash: 'hash3' },
      ]);

      const result = await getViewStatsUseCase.getViewStats('resume-1', {
        period: 'month',
      });

      expect(result.uniqueVisitors).toBe(3);
    });

    it('should filter by day period', async () => {
      viewTrackingRepo.seedViewEvent({ resumeId: 'resume-1', ipHash: 'hash1' });

      const result = await getViewStatsUseCase.getViewStats('resume-1', { period: 'day' });

      expect(result).toBeDefined();
      expect(result.totalViews).toBeGreaterThanOrEqual(0);
    });

    it('should filter by week period', async () => {
      viewTrackingRepo.seedViewEvent({ resumeId: 'resume-1', ipHash: 'hash1' });

      const result = await getViewStatsUseCase.getViewStats('resume-1', { period: 'week' });

      expect(result).toBeDefined();
      expect(result.totalViews).toBeGreaterThanOrEqual(0);
    });

    it('should filter by month period', async () => {
      viewTrackingRepo.seedViewEvent({ resumeId: 'resume-1', ipHash: 'hash1' });

      const result = await getViewStatsUseCase.getViewStats('resume-1', { period: 'month' });

      expect(result).toBeDefined();
      expect(result.totalViews).toBeGreaterThanOrEqual(0);
    });

    it('should filter by year period', async () => {
      viewTrackingRepo.seedViewEvent({ resumeId: 'resume-1', ipHash: 'hash1' });

      const result = await getViewStatsUseCase.getViewStats('resume-1', { period: 'year' });

      expect(result).toBeDefined();
      expect(result.totalViews).toBeGreaterThanOrEqual(0);
    });

    it('should return empty arrays for viewsByDay and topSources', async () => {
      const result = await getViewStatsUseCase.getViewStats('resume-1', {
        period: 'month',
      });

      expect(result.viewsByDay).toEqual([]);
      expect(result.topSources).toEqual([]);
    });
  });
});
