/**
 * GetShareEventsUseCase - Unit Tests
 *
 * Contract tests for detailed event retrieval.
 * Verifies authorization, filtering, and field mapping.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { ForbiddenException } from '@nestjs/common';
import { InMemoryShareAnalyticsRepository } from '../../../testing';
import { GetShareEventsUseCase } from './get-share-events.use-case';

describe('GetShareEventsUseCase', () => {
  let useCase: GetShareEventsUseCase;
  let repository: InMemoryShareAnalyticsRepository;

  const userId = 'user-1';
  const shareId = 'share-1';
  const resumeId = 'resume-1';

  beforeEach(() => {
    repository = new InMemoryShareAnalyticsRepository();
    useCase = new GetShareEventsUseCase(repository);

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

  it('should map event fields correctly', async () => {
    repository.seedAnalytics({
      shareId,
      event: 'VIEW',
      ipHash: 'abc123',
      userAgent: 'Chrome/120',
      referer: 'https://linkedin.com',
      country: 'BR',
      city: 'Porto Alegre',
    });

    const events = await useCase.execute(shareId, userId);

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('VIEW');
    expect(events[0].ipAddress).toBe('abc123');
    expect(events[0].userAgent).toBe('Chrome/120');
    expect(events[0].referrer).toBe('https://linkedin.com');
    expect(events[0].country).toBe('BR');
    expect(events[0].city).toBe('Porto Alegre');
    expect(events[0].createdAt).toBeInstanceOf(Date);
  });

  it('should filter events by eventType', async () => {
    repository.seedAnalytics([
      { shareId, event: 'VIEW', ipHash: 'h1' },
      { shareId, event: 'DOWNLOAD', ipHash: 'h2' },
      { shareId, event: 'VIEW', ipHash: 'h3' },
    ]);

    const events = await useCase.execute(shareId, userId, { eventType: 'DOWNLOAD' });

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('DOWNLOAD');
  });

  it('should return empty array when no events exist', async () => {
    const events = await useCase.execute(shareId, userId);

    expect(events).toEqual([]);
  });
});
