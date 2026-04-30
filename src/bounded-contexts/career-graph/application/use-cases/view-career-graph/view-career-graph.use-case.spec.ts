import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryCareerCohortRepository } from '../../../testing';
import { ViewCareerGraphUseCase } from './view-career-graph.use-case';

describe('ViewCareerGraphUseCase', () => {
  let repo: InMemoryCareerCohortRepository;
  let useCase: ViewCareerGraphUseCase;

  beforeEach(() => {
    repo = new InMemoryCareerCohortRepository();
    useCase = new ViewCareerGraphUseCase(repo);
  });

  it('returns the user snapshot, cohort buckets, and 3/5/10-year projections', async () => {
    repo.setRequesterSnapshot({ experienceYears: 3, jobTitle: 'Mid-level Developer' });
    repo.setBuckets([
      {
        experienceYears: 2,
        peerCount: 10,
        topJobTitles: [{ title: 'Junior', count: 10 }],
      },
      {
        experienceYears: 5,
        peerCount: 25,
        topJobTitles: [
          { title: 'Senior', count: 20 },
          { title: 'Tech Lead', count: 5 },
        ],
      },
      {
        experienceYears: 8,
        peerCount: 12,
        topJobTitles: [{ title: 'Staff', count: 12 }],
      },
      {
        experienceYears: 13,
        peerCount: 4,
        topJobTitles: [{ title: 'Principal', count: 4 }],
      },
    ]);

    const out = await useCase.execute({
      requesterId: 'user-1',
      stack: ['react', 'typescript'],
      maxBuckets: 20,
    });

    expect(out.user.experienceYears).toBe(3);
    expect(out.totalPeers).toBe(51);
    expect(out.buckets.map((b) => b.experienceYears)).toEqual([2, 5, 8, 13]);
    // 3 years of exp → closest bucket is 2 years
    expect(out.current?.experienceYears).toBe(2);
    // 3y → projection +3 = 6, closest bucket = 5
    expect(out.projections.find((p) => p.yearsAhead === 3)?.bucket?.experienceYears).toBe(5);
    // 3y → projection +5 = 8, exact match
    expect(out.projections.find((p) => p.yearsAhead === 5)?.bucket?.experienceYears).toBe(8);
    // 3y → projection +10 = 13, exact match
    expect(out.projections.find((p) => p.yearsAhead === 10)?.bucket?.experienceYears).toBe(13);
  });

  it('handles a missing requester snapshot (new user, empty resume)', async () => {
    repo.setBuckets([
      {
        experienceYears: 0,
        peerCount: 3,
        topJobTitles: [{ title: 'Intern', count: 3 }],
      },
    ]);

    const out = await useCase.execute({
      requesterId: 'user-404',
      stack: ['react'],
      maxBuckets: 20,
    });
    expect(out.user.experienceYears).toBe(0);
    expect(out.user.jobTitle).toBeNull();
    expect(out.totalPeers).toBe(3);
  });

  it('returns empty outputs when no peers exist', async () => {
    repo.setRequesterSnapshot({ experienceYears: 5, jobTitle: null });
    const out = await useCase.execute({
      requesterId: 'user-1',
      stack: ['obscure-framework'],
      maxBuckets: 20,
    });
    expect(out.totalPeers).toBe(0);
    expect(out.current).toBeNull();
    expect(out.buckets).toEqual([]);
    expect(out.projections.every((p) => p.bucket === null)).toBe(true);
  });
});
