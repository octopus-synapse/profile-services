import { beforeEach, describe, expect, it } from 'bun:test';
import type { EventPublisher } from '@/shared-kernel';
import { stubLogger } from '@/shared-kernel/logger/testing';

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

import {
  FitAnswerRepositoryPort,
  type FitAnswerWrite,
  type SavedFitAnswer,
} from '../../domain/ports/fit-answer.repository.port';
import {
  type FitQuestionInput,
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';
import {
  FitQuestionSetRepositoryPort,
  type FitQuestionSetWrite,
  type SavedFitQuestionSet,
} from '../../domain/ports/fit-question-set.repository.port';
import {
  FitRemapHistoryRepositoryPort,
  type FitRemapSnapshot,
} from '../../domain/ports/fit-remap-history.repository.port';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
  type UserFitProfileWrite,
} from '../../domain/ports/user-fit-profile.repository.port';
import { type SampleableQuestion, sampleQuestions } from '../../domain/rules/fit-sampler.rules';
import { FIT_DIMENSIONS, type FitVector } from '../../domain/types';
import {
  FitAnswerCountMismatchError,
  FitAnswerMismatchError,
  FitQuestionSetAlreadyCompletedError,
  FitQuestionSetNotFoundError,
  FitQuestionSetOwnershipError,
  SubmitFitAnswersUseCase,
} from './submit-fit-answers.use-case';

class InMemoryQuestionSets extends FitQuestionSetRepositoryPort {
  public rows: SavedFitQuestionSet[] = [];
  async findOpenByUserId() {
    return null;
  }
  async findById(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async findBySeed() {
    return null;
  }
  async create(input: FitQuestionSetWrite) {
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
  async countByUser() {
    return this.rows.length;
  }
}

class InMemoryFitQuestions extends FitQuestionRepositoryPort {
  public rows: FitQuestionRecord[] = [];
  async listActive() {
    return this.rows.filter((r) => r.isActive);
  }
  async listAll() {
    return this.rows;
  }
  async findById(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async findManyByIds(ids: readonly string[]) {
    return this.rows.filter((r) => ids.includes(r.id));
  }
  async create(_input: FitQuestionInput): Promise<FitQuestionRecord> {
    throw new Error('not used');
  }
  async update(_id: string, _patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    throw new Error('not used');
  }
  async delete() {}
}

class InMemoryAnswers extends FitAnswerRepositoryPort {
  public saved: SavedFitAnswer[] = [];
  async saveBatch(answers: readonly FitAnswerWrite[]) {
    const rows: SavedFitAnswer[] = answers.map((a, idx) => ({
      id: `a-${this.saved.length + idx + 1}`,
      ...a,
      answeredAt: new Date('2026-04-23T12:00:00Z'),
    }));
    this.saved.push(...rows);
    return rows;
  }
  async listByUser(userId: string) {
    return this.saved.filter((a) => a.userId === userId);
  }
  async listByQuestionSet(questionSetId: string) {
    return this.saved.filter((a) => a.questionSetId === questionSetId);
  }
  async deleteByUser(userId: string) {
    this.saved = this.saved.filter((a) => a.userId !== userId);
  }
}

class InMemoryProfiles extends UserFitProfileRepositoryPort {
  public row: SavedUserFitProfile | null = null;
  async findByUserId(userId: string) {
    return this.row && this.row.userId === userId ? this.row : null;
  }
  async upsert(input: UserFitProfileWrite): Promise<SavedUserFitProfile> {
    this.row = {
      id: this.row?.id ?? 'p-1',
      userId: input.userId,
      vector: input.vector,
      version: input.version,
      computedAt: new Date('2026-04-23T12:00:00Z'),
      expiresAt: input.expiresAt,
    };
    return this.row;
  }
  async anonymize(userId: string) {
    if (this.row && this.row.userId === userId) {
      this.row = { ...this.row, vector: null };
    }
  }
}

class InMemoryHistory extends FitRemapHistoryRepositoryPort {
  public rows: FitRemapSnapshot[] = [];
  public throwOnAppend = false;
  async append(userId: string, vector: FitVector): Promise<FitRemapSnapshot> {
    if (this.throwOnAppend) throw new Error('DB down');
    const row: FitRemapSnapshot = {
      id: `h-${this.rows.length + 1}`,
      userId,
      vector,
      snapshotAt: new Date('2026-04-23T12:00:00Z'),
    };
    this.rows.push(row);
    return row;
  }
  async listByUser(userId: string, limit: number) {
    return this.rows.filter((r) => r.userId === userId).slice(-limit);
  }
}

function seedPool(questions: InMemoryFitQuestions, perDimension = 8) {
  let counter = 0;
  for (const dimension of FIT_DIMENSIONS) {
    for (let i = 0; i < perDimension; i++) {
      counter += 1;
      questions.rows.push({
        id: `q-${counter}`,
        key: `${dimension}.${i}`,
        dimension,
        textEn: `EN ${dimension} ${i}`,
        textPtBr: `PT ${dimension} ${i}`,
        scaleType: 'likert5',
        weight: 1,
        isActive: true,
      });
    }
  }
}

function expectedIdsForSeed(questions: InMemoryFitQuestions, seed: string): string[] {
  const sampleable: SampleableQuestion[] = questions.rows.map((q) => ({
    id: q.id,
    dimension: q.dimension,
  }));
  return sampleQuestions(sampleable, seed).map((q) => q.id);
}

describe('SubmitFitAnswersUseCase', () => {
  let questionSets: InMemoryQuestionSets;
  let questions: InMemoryFitQuestions;
  let answers: InMemoryAnswers;
  let profiles: InMemoryProfiles;
  let history: InMemoryHistory;
  let useCase: SubmitFitAnswersUseCase;

  beforeEach(() => {
    questionSets = new InMemoryQuestionSets();
    questions = new InMemoryFitQuestions();
    answers = new InMemoryAnswers();
    profiles = new InMemoryProfiles();
    history = new InMemoryHistory();
    useCase = new SubmitFitAnswersUseCase(
      questionSets,
      questions,
      answers,
      profiles,
      history,
      stubEventPublisher,
      stubLogger,
    );
    seedPool(questions);
  });

  it('rejects a submission with the wrong answer count', async () => {
    const set = await questionSets.create({ userId: 'u-1', seed: 'seed-a' });
    await expect(
      useCase.execute({
        userId: 'u-1',
        questionSetId: set.id,
        answers: [{ questionId: 'q-1', rawValue: 3 }],
      }),
    ).rejects.toBeInstanceOf(FitAnswerCountMismatchError);
  });

  it('throws when the question set does not exist', async () => {
    const ids = expectedIdsForSeed(questions, 'seed-a');
    const submitted = ids.map((id) => ({ questionId: id, rawValue: 3 }));
    await expect(
      useCase.execute({ userId: 'u-1', questionSetId: 'missing', answers: submitted }),
    ).rejects.toBeInstanceOf(FitQuestionSetNotFoundError);
  });

  it('rejects a submission by a different user', async () => {
    const set = await questionSets.create({ userId: 'u-1', seed: 'seed-a' });
    const ids = expectedIdsForSeed(questions, set.seed);
    const submitted = ids.map((id) => ({ questionId: id, rawValue: 3 }));
    await expect(
      useCase.execute({ userId: 'other', questionSetId: set.id, answers: submitted }),
    ).rejects.toBeInstanceOf(FitQuestionSetOwnershipError);
  });

  it('rejects a double-submission', async () => {
    const set = await questionSets.create({ userId: 'u-1', seed: 'seed-a' });
    (set as { completedAt: Date | null }).completedAt = new Date();
    const ids = expectedIdsForSeed(questions, set.seed);
    const submitted = ids.map((id) => ({ questionId: id, rawValue: 3 }));
    await expect(
      useCase.execute({ userId: 'u-1', questionSetId: set.id, answers: submitted }),
    ).rejects.toBeInstanceOf(FitQuestionSetAlreadyCompletedError);
  });

  it('rejects answers that reference questions outside the sampled set', async () => {
    const set = await questionSets.create({ userId: 'u-1', seed: 'seed-a' });
    const ids = expectedIdsForSeed(questions, set.seed);
    const submitted = ids.map((id) => ({ questionId: id, rawValue: 3 }));
    submitted[0] = { questionId: 'q-999', rawValue: 3 };
    await expect(
      useCase.execute({ userId: 'u-1', questionSetId: set.id, answers: submitted }),
    ).rejects.toBeInstanceOf(FitAnswerMismatchError);
  });

  it('persists answers + vector + history and marks the set completed', async () => {
    const set = await questionSets.create({ userId: 'u-1', seed: 'seed-a' });
    const ids = expectedIdsForSeed(questions, set.seed);
    const submitted = ids.map((id) => ({ questionId: id, rawValue: 5 }));

    const profile = await useCase.execute(
      { userId: 'u-1', questionSetId: set.id, answers: submitted },
      new Date('2026-04-23T12:00:00Z'),
    );

    expect(answers.saved).toHaveLength(25);
    expect(profile.version).toBe(1);
    expect(profile.vector).not.toBeNull();
    // TTL 90 days → 2026-04-23 + 90d = 2026-07-22T12:00:00Z
    expect(profile.expiresAt.toISOString()).toBe('2026-07-22T12:00:00.000Z');
    expect(history.rows).toHaveLength(1);
    const updated = questionSets.rows.find((r) => r.id === set.id);
    expect(updated?.completedAt).toBeInstanceOf(Date);
  });

  it('bumps the version on each subsequent submission', async () => {
    const set1 = await questionSets.create({ userId: 'u-1', seed: 'seed-a' });
    const ids1 = expectedIdsForSeed(questions, set1.seed);
    await useCase.execute({
      userId: 'u-1',
      questionSetId: set1.id,
      answers: ids1.map((id) => ({ questionId: id, rawValue: 3 })),
    });

    const set2 = await questionSets.create({ userId: 'u-1', seed: 'seed-b' });
    const ids2 = expectedIdsForSeed(questions, set2.seed);
    const profile2 = await useCase.execute({
      userId: 'u-1',
      questionSetId: set2.id,
      answers: ids2.map((id) => ({ questionId: id, rawValue: 4 })),
    });
    expect(profile2.version).toBe(2);
    expect(history.rows).toHaveLength(2);
  });

  it('continues the commit when the history append fails', async () => {
    const set = await questionSets.create({ userId: 'u-1', seed: 'seed-a' });
    const ids = expectedIdsForSeed(questions, set.seed);
    const submitted = ids.map((id) => ({ questionId: id, rawValue: 3 }));
    history.throwOnAppend = true;

    const profile = await useCase.execute({
      userId: 'u-1',
      questionSetId: set.id,
      answers: submitted,
    });
    expect(profile.version).toBe(1);
    expect(history.rows).toHaveLength(0);
    const updated = questionSets.rows.find((r) => r.id === set.id);
    expect(updated?.completedAt).toBeInstanceOf(Date);
  });
});
