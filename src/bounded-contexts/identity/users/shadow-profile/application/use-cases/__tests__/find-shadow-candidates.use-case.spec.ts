import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryShadowProfileRepository } from '../../../testing/in-memory-shadow-profile.repository';
import { FindShadowCandidatesUseCase } from '../find-shadow-candidates.use-case';

describe('FindShadowCandidatesUseCase', () => {
  let repository: InMemoryShadowProfileRepository;
  let useCase: FindShadowCandidatesUseCase;

  beforeEach(() => {
    repository = new InMemoryShadowProfileRepository();
    useCase = new FindShadowCandidatesUseCase(repository);
  });

  it('returns an empty list when neither email nor githubLogin is supplied', async () => {
    const result = await useCase.execute({});
    expect(result).toEqual([]);
  });

  it('finds an unclaimed shadow profile by github login', async () => {
    repository.seed({
      id: 'shadow-1',
      source: 'github',
      externalHandle: 'octocat',
      contactEmail: null,
      payload: {},
      claimedByUserId: null,
    });

    const result = await useCase.execute({ githubLogin: 'octocat' });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('shadow-1');
  });

  it('skips profiles that are already claimed', async () => {
    repository.seed({
      id: 'shadow-1',
      source: 'github',
      externalHandle: 'octocat',
      contactEmail: null,
      payload: {},
      claimedByUserId: 'user-9',
    });

    const result = await useCase.execute({ githubLogin: 'octocat' });

    expect(result).toEqual([]);
  });

  it('finds by email match', async () => {
    repository.seed({
      id: 'shadow-1',
      source: 'github',
      externalHandle: 'octocat',
      contactEmail: 'me@example.com',
      payload: {},
      claimedByUserId: null,
    });

    const result = await useCase.execute({ email: 'me@example.com' });

    expect(result).toHaveLength(1);
  });
});
