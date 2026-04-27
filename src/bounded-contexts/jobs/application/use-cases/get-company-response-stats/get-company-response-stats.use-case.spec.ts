import { describe, expect, it } from 'bun:test';
import { InMemoryApplicationTrackerRepository } from '../../../testing';
import { GetCompanyResponseStatsUseCase } from './get-company-response-stats.use-case';

const DAY = 24 * 60 * 60 * 1000;

describe('GetCompanyResponseStatsUseCase', () => {
  it('returns zero stats when no applications exist for the company', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    const out = await new GetCompanyResponseStatsUseCase(repo).execute('Nonexistent');
    expect(out).toEqual({
      company: 'Nonexistent',
      sampleSize: 0,
      p50Days: null,
      p90Days: null,
      responseRate: 0,
    });
  });

  it('computes p50 + responseRate from first response events', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    const base = new Date('2026-01-01T00:00:00.000Z');
    // Three apps to Acme: one responds in 5 days, one in 7 days, one never.
    repo.seedApplication({
      userId: 'u-a',
      createdAt: base,
      job: { company: 'Acme' },
      events: [
        { type: 'SUBMITTED', occurredAt: base },
        { type: 'VIEWED', occurredAt: new Date(base.getTime() + 5 * DAY) },
      ],
    });
    repo.seedApplication({
      userId: 'u-b',
      createdAt: base,
      job: { company: 'Acme' },
      events: [
        { type: 'SUBMITTED', occurredAt: base },
        { type: 'VIEWED', occurredAt: new Date(base.getTime() + 7 * DAY) },
      ],
    });
    repo.seedApplication({
      userId: 'u-c',
      createdAt: base,
      job: { company: 'Acme' },
      events: [{ type: 'SUBMITTED', occurredAt: base }],
    });

    const out = await new GetCompanyResponseStatsUseCase(repo).execute('Acme');

    expect(out.company).toBe('Acme');
    expect(out.sampleSize).toBe(3);
    expect(out.responseRate).toBeCloseTo(2 / 3, 5);
    expect(out.p50Days).toBe(7);
    expect(out.p90Days).toBe(7);
  });
});
