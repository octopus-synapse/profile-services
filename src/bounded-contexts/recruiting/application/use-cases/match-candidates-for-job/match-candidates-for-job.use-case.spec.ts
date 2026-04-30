import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryCandidateDirectoryRepository } from '../../../testing';
import { MatchCandidatesForJobUseCase } from './match-candidates-for-job.use-case';

describe('MatchCandidatesForJobUseCase', () => {
  let repo: InMemoryCandidateDirectoryRepository;
  let useCase: MatchCandidatesForJobUseCase;

  beforeEach(() => {
    repo = new InMemoryCandidateDirectoryRepository();
    useCase = new MatchCandidatesForJobUseCase(repo);
  });

  it('ranks candidates by fit score, highest first', async () => {
    repo.add({
      userId: 'u1',
      username: 'a',
      name: 'A',
      photoURL: null,
      bio: null,
      skills: ['react', 'typescript'],
    });
    repo.add({
      userId: 'u2',
      username: 'b',
      name: 'B',
      photoURL: null,
      bio: null,
      skills: ['react', 'typescript', 'postgres'],
    });
    repo.add({ userId: 'u3', username: 'c', name: 'C', photoURL: null, bio: null, skills: ['go'] });

    const out = await useCase.execute({
      requesterId: 'recruiter',
      jobSkills: ['react', 'typescript', 'postgres'],
      jobMinEnglish: null,
      jobRemotePolicy: null,
      limit: 10,
    });

    expect(out.candidates.map((c) => c.userId)).toEqual(['u2', 'u1', 'u3']);
    expect(out.candidates[0].fit.breakdown.matchedSkills.length).toBe(3);
    expect(out.candidates[2].fit.breakdown.missingSkills.length).toBe(3);
  });

  it('honors the limit parameter', async () => {
    for (let i = 0; i < 15; i++) {
      repo.add({
        userId: `u${i}`,
        username: null,
        name: null,
        photoURL: null,
        bio: null,
        skills: ['react'],
      });
    }

    const out = await useCase.execute({
      requesterId: 'r',
      jobSkills: ['react'],
      jobMinEnglish: null,
      jobRemotePolicy: null,
      limit: 5,
    });
    expect(out.candidates.length).toBe(5);
  });

  it('excludes the requester from the pool', async () => {
    repo.add({
      userId: 'recruiter',
      username: null,
      name: null,
      photoURL: null,
      bio: null,
      skills: ['react', 'typescript', 'postgres'],
    });
    repo.add({
      userId: 'other',
      username: null,
      name: null,
      photoURL: null,
      bio: null,
      skills: ['react'],
    });

    const out = await useCase.execute({
      requesterId: 'recruiter',
      jobSkills: ['react', 'typescript', 'postgres'],
      jobMinEnglish: null,
      jobRemotePolicy: null,
      limit: 10,
    });
    expect(out.candidates.map((c) => c.userId)).toEqual(['other']);
  });

  it('returns an empty list when no candidates exist', async () => {
    const out = await useCase.execute({
      requesterId: 'r',
      jobSkills: ['react'],
      jobMinEnglish: null,
      jobRemotePolicy: null,
      limit: 10,
    });
    expect(out.candidates).toEqual([]);
    expect(out.poolSize).toBe(0);
  });
});
