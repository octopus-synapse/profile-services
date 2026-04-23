import { describe, expect, it } from 'bun:test';
import {
  type FitQuestionInput,
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';
import { GetFitQuestionUseCase } from './get-fit-question.use-case';

class StubRepo extends FitQuestionRepositoryPort {
  constructor(private readonly row: FitQuestionRecord | null) {
    super();
  }
  async listActive() {
    return [];
  }
  async listAll() {
    return [];
  }
  async findById(id: string) {
    return this.row && this.row.id === id ? this.row : null;
  }
  async findManyByIds() {
    return [];
  }
  async create(_input: FitQuestionInput): Promise<FitQuestionRecord> {
    throw new Error('not used');
  }
  async update(_id: string, _patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    throw new Error('not used');
  }
  async delete() {}
}

describe('GetFitQuestionUseCase', () => {
  it('returns null when the id is unknown', async () => {
    const useCase = new GetFitQuestionUseCase(new StubRepo(null));
    expect(await useCase.execute('missing')).toBeNull();
  });

  it('returns the matching row', async () => {
    const row: FitQuestionRecord = {
      id: 'q-1',
      key: 'K',
      dimension: 'BIG_FIVE_OPENNESS',
      textEn: 'en',
      textPtBr: 'pt',
      scaleType: 'likert5',
      weight: 1,
      isActive: true,
    };
    const useCase = new GetFitQuestionUseCase(new StubRepo(row));
    expect(await useCase.execute('q-1')).toBe(row);
  });
});
