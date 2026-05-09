import { beforeEach, describe, expect, it } from 'bun:test';
import {
  CandidateDirectoryUnavailableException,
  CandidatePoolEmptyException,
  MatchCandidatesInvalidLimitException,
  MatchCandidatesNoCriteriaException,
} from '../../../domain/exceptions/recruiting.exceptions';
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

  it('throws CandidatePoolEmptyException when no candidates exist', async () => {
    await expect(
      useCase.execute({
        requesterId: 'r',
        jobSkills: ['react'],
        jobMinEnglish: null,
        jobRemotePolicy: null,
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(CandidatePoolEmptyException);
  });

  it('throws MatchCandidatesInvalidLimitException for out-of-range limit', async () => {
    await expect(
      useCase.execute({
        requesterId: 'r',
        jobSkills: ['react'],
        jobMinEnglish: null,
        jobRemotePolicy: null,
        limit: 0,
      }),
    ).rejects.toBeInstanceOf(MatchCandidatesInvalidLimitException);
    await expect(
      useCase.execute({
        requesterId: 'r',
        jobSkills: ['react'],
        jobMinEnglish: null,
        jobRemotePolicy: null,
        limit: 101,
      }),
    ).rejects.toBeInstanceOf(MatchCandidatesInvalidLimitException);
  });

  it('throws MatchCandidatesNoCriteriaException when no criteria are provided', async () => {
    await expect(
      useCase.execute({
        requesterId: 'r',
        jobSkills: [],
        jobMinEnglish: null,
        jobRemotePolicy: null,
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(MatchCandidatesNoCriteriaException);
  });

  it('throws CandidateDirectoryUnavailableException when the directory rejects', async () => {
    const failingRepo = {
      loadSearchablePool: async () => {
        throw new Error('downstream down');
      },
    } as never;
    const uc = new MatchCandidatesForJobUseCase(failingRepo);
    await expect(
      uc.execute({
        requesterId: 'r',
        jobSkills: ['react'],
        jobMinEnglish: null,
        jobRemotePolicy: null,
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(CandidateDirectoryUnavailableException);
  });
});
