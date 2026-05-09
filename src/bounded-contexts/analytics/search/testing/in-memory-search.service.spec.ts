import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemorySearchService } from './in-memory-search.service';

describe('InMemorySearchService.globalSearch', () => {
  let svc: InMemorySearchService;

  beforeEach(() => {
    svc = new InMemorySearchService();
  });

  it('returns four groups in canonical order (resumes, users, jobs, posts)', async () => {
    svc.seedResume({ id: 'r1', fullName: 'react developer' });
    svc.seedUser({ id: 'u1', name: 'react fan' });
    svc.seedJob({ id: 'j1', title: 'react engineer' });
    svc.seedPost({ id: 'p1', content: 'react release notes' });

    const result = await svc.globalSearch('react', 10);

    expect(result.groups.map((g) => g.type)).toEqual(['resumes', 'users', 'jobs', 'posts']);
    expect(result.groups.every((g) => g.items.length === 1)).toBe(true);
  });

  it('caps each group at the supplied limit', async () => {
    for (let i = 0; i < 8; i++) {
      svc.seedUser({ id: `u${i}`, name: `react user ${i}` });
      svc.seedJob({ id: `j${i}`, title: `react job ${i}` });
    }

    const result = await svc.globalSearch('react', 3);

    const users = result.groups.find((g) => g.type === 'users');
    const jobs = result.groups.find((g) => g.type === 'jobs');
    expect(users?.items.length).toBe(3);
    expect(jobs?.items.length).toBe(3);
  });

  it('returns no groups when the query is empty or whitespace', async () => {
    svc.seedUser({ id: 'u1', name: 'react fan' });

    expect((await svc.globalSearch('', 5)).groups).toEqual([]);
    expect((await svc.globalSearch('   ', 5)).groups).toEqual([]);
  });
});
