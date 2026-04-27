import { describe, expect, it } from 'bun:test';
import { InMemoryJobsRepository } from '../../testing';
import { JobEnrichmentService } from './job-enrichment.service';

describe('JobEnrichmentService', () => {
  it('returns false flags for an anonymous viewer', async () => {
    const repo = new InMemoryJobsRepository();
    const service = new JobEnrichmentService(repo);
    const out = await service.withBookmarkedAndApplied([{ id: 'a' }, { id: 'b' }], undefined);
    expect(out.every((r) => r.isBookmarked === false && r.hasApplied === false)).toBe(true);
  });

  it('looks up bookmarks and active applications for a known viewer', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedBookmark('a', 'viewer');
    repo.seedApplication({
      id: 'app-1',
      jobId: 'b',
      userId: 'viewer',
      status: 'SUBMITTED',
      coverLetter: null,
      resumeId: null,
      tailoredVersionId: null,
      createdAt: new Date(),
    });
    const service = new JobEnrichmentService(repo);
    const out = await service.withBookmarkedAndApplied([{ id: 'a' }, { id: 'b' }], 'viewer');
    expect(out[0]).toEqual({ id: 'a', isBookmarked: true, hasApplied: false });
    expect(out[1]).toEqual({ id: 'b', isBookmarked: false, hasApplied: true });
  });

  it('returns an empty list unchanged', async () => {
    const repo = new InMemoryJobsRepository();
    const out = await new JobEnrichmentService(repo).withBookmarkedAndApplied([], 'viewer');
    expect(out).toEqual([]);
  });
});
