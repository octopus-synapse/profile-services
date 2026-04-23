import { describe, expect, it } from 'bun:test';
import {
  type FitQuestionInput,
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';
import { CreateFitQuestionUseCase } from './create-fit-question.use-case';

class StubRepo extends FitQuestionRepositoryPort {
  public created: FitQuestionInput[] = [];
  async listActive() {
    return [];
  }
  async listAll() {
    return [];
  }
  async findById() {
    return null;
  }
  async findManyByIds() {
    return [];
  }
  async create(input: FitQuestionInput): Promise<FitQuestionRecord> {
    this.created.push(input);
    return { id: 'q-1', isActive: true, ...input };
  }
  async update(_id: string, _patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    throw new Error('not used');
  }
  async delete() {}
}

describe('CreateFitQuestionUseCase', () => {
  it('forwards the payload to the repository and returns the saved row', async () => {
    const repo = new StubRepo();
    const useCase = new CreateFitQuestionUseCase(repo);
    const input: FitQuestionInput = {
      key: 'K1',
      dimension: 'BIG_FIVE_OPENNESS',
      textEn: 'I like new ideas',
      textPtBr: 'Gosto de ideias novas',
      scaleType: 'likert5',
      weight: 1,
    };
    const saved = await useCase.execute(input);
    expect(repo.created).toHaveLength(1);
    expect(saved.id).toBe('q-1');
    expect(saved.isActive).toBe(true);
    expect(saved.key).toBe('K1');
  });
});
