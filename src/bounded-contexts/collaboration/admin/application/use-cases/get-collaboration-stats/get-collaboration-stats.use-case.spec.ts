import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryAdminCollaborationsRepository } from '../../../testing';
import { GetCollaborationStatsUseCase } from './get-collaboration-stats.use-case';

describe('GetCollaborationStatsUseCase', () => {
  let repo: InMemoryAdminCollaborationsRepository;
  let useCase: GetCollaborationStatsUseCase;

  beforeEach(() => {
    repo = new InMemoryAdminCollaborationsRepository();
    useCase = new GetCollaborationStatsUseCase(repo);
  });

  it('returns the seeded stats from the repo', async () => {
    repo.seedStats({
      totalCollaborations: 12,
      byRole: [
        { role: 'EDITOR', count: 7 },
        { role: 'VIEWER', count: 5 },
      ],
    });

    const result = await useCase.execute();

    expect(result.totalCollaborations).toBe(12);
    expect(result.byRole).toEqual([
      { role: 'EDITOR', count: 7 },
      { role: 'VIEWER', count: 5 },
    ]);
  });
});
