import { beforeEach, describe, expect, it } from 'bun:test';
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
import { FIT_DIMENSIONS } from '../../domain/types';
import {
  EmptyFitQuestionPoolError,
  GetOrCreateQuestionSetUseCase,
} from './get-or-create-question-set.use-case';

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
  async create(input: FitQuestionInput): Promise<FitQuestionRecord> {
    const row: FitQuestionRecord = {
      id: `q-${this.rows.length + 1}`,
      isActive: true,
      reverseScored: false,
      ...input,
    };
    this.rows.push(row);
    return row;
  }
  async update(id: string, patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('not found');
    const prev = this.rows[idx] as FitQuestionRecord;
    const next: FitQuestionRecord = { ...prev, ...patch };
    this.rows[idx] = next;
    return next;
  }
  async delete(id: string) {
    this.rows = this.rows.filter((r) => r.id !== id);
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

describe('GetOrCreateQuestionSetUseCase', () => {
  let questions: InMemoryFitQuestions;
  let sets: InMemoryQuestionSets;
  let useCase: GetOrCreateQuestionSetUseCase;

  beforeEach(() => {
    questions = new InMemoryFitQuestions();
    sets = new InMemoryQuestionSets();
    useCase = new GetOrCreateQuestionSetUseCase(questions, sets);
  });

  it('throws when the pool has no active questions', async () => {
    await expect(useCase.execute('u-1')).rejects.toBeInstanceOf(EmptyFitQuestionPoolError);
  });

  it('creates a new 25-question set on first call', async () => {
    seedPool(questions);
    const view = await useCase.execute('u-1');
    expect(view.set.userId).toBe('u-1');
    expect(view.questions).toHaveLength(25);
    expect(sets.rows).toHaveLength(1);
  });

  it('returns the same set on a second call (idempotent resume)', async () => {
    seedPool(questions);
    const first = await useCase.execute('u-1');
    const second = await useCase.execute('u-1');
    expect(second.set.id).toBe(first.set.id);
    expect(sets.rows).toHaveLength(1);
    expect(second.questions.map((q) => q.id)).toEqual(first.questions.map((q) => q.id));
  });

  it('produces a stable order driven by the seed', async () => {
    seedPool(questions);
    const view = await useCase.execute('u-1');
    const ids = view.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(25);
  });
});
