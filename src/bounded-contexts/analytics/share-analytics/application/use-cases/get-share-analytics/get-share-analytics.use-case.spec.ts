/**
 * GetShareAnalyticsUseCase - Unit Tests
 *
 * Contract tests for aggregated analytics retrieval.
 * Verifies authorization checks and analytics aggregation.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ForbiddenException } from '@nestjs/common';
import { InMemoryShareAnalyticsRepository } from '../../../testing';
import { GetShareAnalyticsUseCase } from './get-share-analytics.use-case';

describe('GetShareAnalyticsUseCase', () => {
  let useCase: GetShareAnalyticsUseCase;
  let repository: InMemoryShareAnalyticsRepository;

  const userId = 'user-1';
  const shareId = 'share-1';
  const resumeId = 'resume-1';

  beforeEach(() => {
    repository = new InMemoryShareAnalyticsRepository();
    useCase = new GetShareAnalyticsUseCase(repository);

    repository.seedShare({
      id: shareId,
      resumeId,
      resume: { userId },
    });
  });

  it('should throw ForbiddenException when share not found', async () => {
    await expect(useCase.execute('non-existent', userId)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user does not own the resume', async () => {
    await expect(useCase.execute(shareId, 'other-user')).rejects.toThrow(ForbiddenException);
  });

  it('should return zero counts when no events exist', async () => {
    const result = await useCase.execute(shareId, userId);

    expect(result.shareId).toBe(shareId);
    expect(result.totalViews).toBe(0);
    expect(result.totalDownloads).toBe(0);
    expect(result.uniqueVisitors).toBe(0);
    expect(result.byCountry).toEqual([]);
    expect(result.recentEvents).toEqual([]);
  });

  it('should aggregate views and downloads correctly', async () => {
    repository.seedAnalytics([
      { shareId, event: 'VIEW', ipHash: 'h1' },
      { shareId, event: 'VIEW', ipHash: 'h2' },
      { shareId, event: 'DOWNLOAD', ipHash: 'h1' },
    ]);

    const result = await useCase.execute(shareId, userId);

    expect(result.totalViews).toBe(2);
    expect(result.totalDownloads).toBe(1);
  });

  it('should count unique visitors by distinct IP hashes', async () => {
    repository.seedAnalytics([
      { shareId, event: 'VIEW', ipHash: 'h1' },
      { shareId, event: 'VIEW', ipHash: 'h1' },
      { shareId, event: 'VIEW', ipHash: 'h2' },
    ]);

    const result = await useCase.execute(shareId, userId);

    expect(result.uniqueVisitors).toBe(2);
  });

  it('should group by country', async () => {
    repository.seedAnalytics([
      { shareId, event: 'VIEW', ipHash: 'h1', country: 'BR' },
      { shareId, event: 'VIEW', ipHash: 'h2', country: 'BR' },
      { shareId, event: 'VIEW', ipHash: 'h3', country: 'US' },
    ]);

    const result = await useCase.execute(shareId, userId);

    expect(result.byCountry).toContainEqual({ country: 'BR', count: 2 });
    expect(result.byCountry).toContainEqual({ country: 'US', count: 1 });
  });
});
