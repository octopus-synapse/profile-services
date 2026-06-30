import { describe, expect, it } from 'bun:test';
import type { RemotePolicy } from '@prisma/client';
import type { CachePort } from '@/shared-kernel/cache';
import { type RecommendedMatch, recommendationsCacheKey } from '@/shared-kernel/cache';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type {
  ExternalJobListingRecord,
  ExternalJobListingsRepositoryPort,
} from '../../../domain/ports/external-job-listings.repository.port';
import type { SavedExternalJobsRepositoryPort } from '../../../domain/ports/saved-external-jobs.repository.port';
import { ListRecommendedJobsUseCase } from './list-recommended-jobs.use-case';

function makeRecord(id: string, externalId: string): ExternalJobListingRecord {
  return {
    id,
    externalId,
    dedupHash: 'h',
    sourceQuery: 'q',
    title: `Job ${id}`,
    company: 'Acme',
    location: 'Remote',
    isRemote: true,
    workMode: 'REMOTE' as RemotePolicy,
    employmentType: null,
    applyUrl: 'https://example.com/apply',
    publisher: null,
    description: 'desc',
    postedAt: null,
    fetchedAt: new Date('2026-06-01T00:00:00Z'),
    raw: {},
  };
}

function buildUseCase(opts: {
  ranked: RecommendedMatch[] | null;
  records: Record<string, ExternalJobListingRecord>;
  saved?: Map<string, string>;
  onKey?: (key: string) => void;
}): ListRecommendedJobsUseCase {
  const cache = {
    isEnabled: true,
    get: async (key: string) => {
      opts.onKey?.(key);
      return opts.ranked as unknown;
    },
  } as unknown as CachePort;
  const listings = {
    findListingById: async (id: string) => opts.records[id] ?? null,
  } as unknown as ExternalJobListingsRepositoryPort;
  const saved = {
    listSavedExternalIds: async () => opts.saved ?? new Map<string, string>(),
  } as unknown as SavedExternalJobsRepositoryPort;
  return new ListRecommendedJobsUseCase(cache, listings, saved, stubLogger);
}

describe('ListRecommendedJobsUseCase', () => {
  it('reads the per-user recommendations cache key', async () => {
    let queriedKey = '';
    const uc = buildUseCase({ ranked: null, records: {}, onKey: (k) => (queriedKey = k) });
    await uc.execute('u1');
    expect(queriedKey).toBe(recommendationsCacheKey('u1'));
  });

  it('returns empty when nothing is precomputed', async () => {
    const res = await buildUseCase({ ranked: null, records: {} }).execute('u1');
    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
  });

  it('hydrates cached ids in rank order and attaches matchScore', async () => {
    const ranked: RecommendedMatch[] = [
      { externalJobId: 'e1', score: 92 },
      { externalJobId: 'e2', score: 71 },
    ];
    const records = { e1: makeRecord('e1', 'x1'), e2: makeRecord('e2', 'x2') };
    const res = await buildUseCase({ ranked, records }).execute('u1');
    expect(res.items.map((i) => i.id)).toEqual(['e1', 'e2']);
    expect(res.items.map((i) => i.matchScore)).toEqual([92, 71]);
    expect(res.total).toBe(2);
  });

  it('drops swept listings (id no longer found) gracefully', async () => {
    const ranked: RecommendedMatch[] = [
      { externalJobId: 'e1', score: 80 },
      { externalJobId: 'gone', score: 75 },
    ];
    const records = { e1: makeRecord('e1', 'x1') };
    const res = await buildUseCase({ ranked, records }).execute('u1');
    expect(res.items.map((i) => i.id)).toEqual(['e1']);
    expect(res.total).toBe(1);
  });

  it('annotates the caller saved state', async () => {
    const ranked: RecommendedMatch[] = [{ externalJobId: 'e1', score: 80 }];
    const records = { e1: makeRecord('e1', 'x1') };
    const saved = new Map<string, string>([['x1', 'saved-1']]);
    const res = await buildUseCase({ ranked, records, saved }).execute('u1');
    expect(res.items[0]?.savedId).toBe('saved-1');
  });
});
