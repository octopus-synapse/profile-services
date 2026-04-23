import { describe, expect, it } from 'bun:test';
import {
  type FitQuestionInput,
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';
import { DeleteFitQuestionUseCase } from './delete-fit-question.use-case';
import { FitQuestionNotFoundError } from './update-fit-question.use-case';

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
  async update(_id: string, _patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    throw new Error('not used');
  }
  async delete(id: string) {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
}

describe('DeleteFitQuestionUseCase', () => {
  it('throws when the question does not exist', async () => {
    const repo = new StubRepo();
    const useCase = new DeleteFitQuestionUseCase(repo);
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(FitQuestionNotFoundError);
  });

  it('removes the question when found', async () => {
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
    const useCase = new DeleteFitQuestionUseCase(repo);
    await useCase.execute('q-1');
    expect(repo.rows).toHaveLength(0);
  });
});
