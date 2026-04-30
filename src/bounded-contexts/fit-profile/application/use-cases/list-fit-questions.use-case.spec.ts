import { describe, expect, it } from 'bun:test';
import {
  type FitQuestionInput,
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';
import { ListFitQuestionsUseCase } from './list-fit-questions.use-case';

class StubRepo extends FitQuestionRepositoryPort {
  constructor(private readonly rows: FitQuestionRecord[]) {
    super();
  }
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

describe('ListFitQuestionsUseCase', () => {
  it('returns every row the repository knows about, active or not', async () => {
    const repo = new StubRepo([
      {
        id: 'q-1',
        key: 'k1',
        dimension: 'BIG_FIVE_OPENNESS',
        textEn: 'en',
        textPtBr: 'pt',
        scaleType: 'likert5',
        weight: 1,
        isActive: true,
      },
      {
        id: 'q-2',
        key: 'k2',
        dimension: 'SDT_AUTONOMY',
        textEn: 'en',
        textPtBr: 'pt',
        scaleType: 'binary',
        weight: 0.5,
        isActive: false,
      },
    ]);
    const useCase = new ListFitQuestionsUseCase(repo);
    const rows = await useCase.execute();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(['q-1', 'q-2']);
  });
});
