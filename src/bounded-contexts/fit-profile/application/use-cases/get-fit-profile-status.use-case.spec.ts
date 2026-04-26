import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  FitQuestionSetRepositoryPort,
  type FitQuestionSetWrite,
  type SavedFitQuestionSet,
} from '../../domain/ports/fit-question-set.repository.port';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
  type UserFitProfileWrite,
} from '../../domain/ports/user-fit-profile.repository.port';
import type { FitVector } from '../../domain/types';
import { GetFitProfileStatusUseCase } from './get-fit-profile-status.use-case';

class InMemoryUserFitProfiles extends UserFitProfileRepositoryPort {
  public row: SavedUserFitProfile | null = null;
  async findByUserId(userId: string) {
    return this.row && this.row.userId === userId ? this.row : null;
  }
  async upsert(input: UserFitProfileWrite): Promise<SavedUserFitProfile> {
    this.row = {
      id: 'p-1',
      userId: input.userId,
      vector: input.vector,
      version: input.version,
      computedAt: new Date(),
      expiresAt: input.expiresAt,
    };
    return this.row;
  }
  async anonymize(userId: string): Promise<void> {
    if (this.row && this.row.userId === userId) {
      this.row = { ...this.row, vector: null };
    }
  }
}

class InMemoryQuestionSets extends FitQuestionSetRepositoryPort {
  public rows: SavedFitQuestionSet[] = [];
  async findOpenByUserId(userId: string) {
    return this.rows.find((r) => r.userId === userId && !r.completedAt) ?? null;
  }
  async findById(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async findBySeed(userId: string, seed: string) {
    return this.rows.find((r) => r.userId === userId && r.seed === seed) ?? null;
  }
  async create(input: FitQuestionSetWrite): Promise<SavedFitQuestionSet> {
    const row: SavedFitQuestionSet = {
      id: `qs-${this.rows.length + 1}`,
      userId: input.userId,
      seed: input.seed,
      createdAt: new Date(),
      completedAt: null,
    };
    this.rows.push(row);
    return row;
  }
  async markCompleted(id: string, completedAt: Date) {
    const row = this.rows.find((r) => r.id === id);
    if (row) (row as { completedAt: Date | null }).completedAt = completedAt;
  }
  async countByUser(userId: string) {
    return this.rows.filter((r) => r.userId === userId).length;
  }
}

const sampleVector: FitVector = {
  bigFive: { BIG_FIVE_OPENNESS: 0.6 },
  schwartz: {},
  sdt: {},
};

describe('GetFitProfileStatusUseCase', () => {
  let profiles: InMemoryUserFitProfiles;
  let questionSets: InMemoryQuestionSets;
  let useCase: GetFitProfileStatusUseCase;

  beforeEach(() => {
    profiles = new InMemoryUserFitProfiles();
    questionSets = new InMemoryQuestionSets();
    useCase = new GetFitProfileStatusUseCase(profiles, questionSets, stubLogger);
  });

  it('reports "never" for a fresh user', async () => {
    const view = await useCase.execute('u-1');
    expect(view.status).toBe('never');
    expect(view.profile).toBeNull();
    expect(view.remainingQuestions).toBe(25);
  });

  it('reports "responded" when profile is fresh', async () => {
    profiles.row = {
      id: 'p-1',
      userId: 'u-1',
      vector: sampleVector,
      version: 1,
      computedAt: new Date('2026-04-01T00:00:00Z'),
      expiresAt: new Date('2026-07-01T00:00:00Z'),
    };
    const view = await useCase.execute('u-1', new Date('2026-04-23T00:00:00Z'));
    expect(view.status).toBe('responded');
    expect(view.answeredAt).toEqual(profiles.row.computedAt);
    expect(view.expiresAt).toEqual(profiles.row.expiresAt);
    expect(view.remainingQuestions).toBe(0);
  });

  it('reports "expired" when the vector is past its TTL', async () => {
    profiles.row = {
      id: 'p-1',
      userId: 'u-1',
      vector: sampleVector,
      version: 1,
      computedAt: new Date('2025-12-01T00:00:00Z'),
      expiresAt: new Date('2026-03-01T00:00:00Z'),
    };
    const view = await useCase.execute('u-1', new Date('2026-04-23T00:00:00Z'));
    expect(view.status).toBe('expired');
    expect(view.remainingQuestions).toBe(25);
  });

  it('reports "never" when the vector was wiped by LGPD (anonymized row)', async () => {
    profiles.row = {
      id: 'p-1',
      userId: 'u-1',
      vector: null,
      version: 1,
      computedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-04-01'),
    };
    const view = await useCase.execute('u-1', new Date('2026-04-23'));
    expect(view.status).toBe('never');
    expect(view.remainingQuestions).toBe(25);
  });
});
