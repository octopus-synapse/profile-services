import { describe, expect, it } from 'bun:test';
import { FitQuestionNotFoundException } from '../../domain/exceptions/fit-profile.exceptions';
import {
  type FitQuestionInput,
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';
import { UpdateFitQuestionUseCase } from './update-fit-question.use-case';

class StubRepo extends FitQuestionRepositoryPort {
  public rows: FitQuestionRecord[] = [];
  async listActive() {
    return this.rows;
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
  async update(id: string, patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('not found');
    const prev = this.rows[idx] as FitQuestionRecord;
    const next: FitQuestionRecord = { ...prev, ...patch };
    this.rows[idx] = next;
    return next;
  }
  async delete() {}
}

describe('UpdateFitQuestionUseCase', () => {
  it('throws when the question does not exist', async () => {
    const repo = new StubRepo();
    const useCase = new UpdateFitQuestionUseCase(repo);
    await expect(useCase.execute('missing', { weight: 2 })).rejects.toBeInstanceOf(
      FitQuestionNotFoundException,
    );
  });

  it('patches the existing row when found', async () => {
    const repo = new StubRepo();
    repo.rows.push({
      id: 'q-1',
      key: 'k',
      dimension: 'BIG_FIVE_OPENNESS',
      textEn: 'en',
      textPtBr: 'pt',
      scaleType: 'likert5',
      weight: 1,
      isActive: true,
    });
    const useCase = new UpdateFitQuestionUseCase(repo);
    const updated = await useCase.execute('q-1', { weight: 2, isActive: false });
    expect(updated.weight).toBe(2);
    expect(updated.isActive).toBe(false);
    expect(updated.textEn).toBe('en'); // untouched
  });
});
