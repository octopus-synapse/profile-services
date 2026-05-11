import { beforeEach, describe, expect, it } from 'bun:test';
import {
  FitAnswerRepositoryPort,
  type FitAnswerWrite,
  type SavedFitAnswer,
} from '../../domain/ports/fit-answer.repository.port';
import { ListFitAnswersUseCase } from './list-fit-answers.use-case';

class InMemoryAnswers extends FitAnswerRepositoryPort {
  public saved: SavedFitAnswer[] = [];
  async saveBatch(answers: readonly FitAnswerWrite[]) {
    const rows: SavedFitAnswer[] = answers.map((a, idx) => ({
      id: `a-${this.saved.length + idx + 1}`,
      ...a,
      answeredAt: new Date(`2026-01-01T00:00:0${idx}Z`),
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

describe('ListFitAnswersUseCase', () => {
  let answers: InMemoryAnswers;
  let useCase: ListFitAnswersUseCase;

  beforeEach(() => {
    answers = new InMemoryAnswers();
    useCase = new ListFitAnswersUseCase(answers);
  });

  it('returns every answer for the caller, sorted as repository orders', async () => {
    await answers.saveBatch([
      { userId: 'user-1', questionId: 'q-1', questionSetId: 'set-1', rawValue: 3 },
      { userId: 'user-1', questionId: 'q-2', questionSetId: 'set-1', rawValue: 4 },
    ]);
    await answers.saveBatch([
      { userId: 'user-2', questionId: 'q-3', questionSetId: 'set-2', rawValue: 5 },
    ]);

    const result = await useCase.execute('user-1');

    expect(result).toHaveLength(2);
    expect(result.map((a) => a.questionId)).toEqual(['q-1', 'q-2']);
  });

  it('returns an empty array when the user has never answered', async () => {
    const result = await useCase.execute('ghost-user');
    expect(result).toEqual([]);
  });
});
