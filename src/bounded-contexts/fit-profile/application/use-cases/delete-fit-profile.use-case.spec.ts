import { beforeEach, describe, expect, it } from 'bun:test';
import {
  FitAnswerRepositoryPort,
  type FitAnswerWrite,
  type SavedFitAnswer,
} from '../../domain/ports/fit-answer.repository.port';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
  type UserFitProfileWrite,
} from '../../domain/ports/user-fit-profile.repository.port';
import { DeleteFitProfileUseCase } from './delete-fit-profile.use-case';

class InMemoryAnswers extends FitAnswerRepositoryPort {
  public saved: SavedFitAnswer[] = [];
  async saveBatch(answers: readonly FitAnswerWrite[]) {
    const rows: SavedFitAnswer[] = answers.map((a, idx) => ({
      id: `a-${this.saved.length + idx + 1}`,
      ...a,
      answeredAt: new Date(),
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
  async upsert(input: UserFitProfileWrite) {
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
  async anonymize(userId: string) {
    if (this.row && this.row.userId === userId) {
      this.row = { ...this.row, vector: null };
    }
  }
}

describe('DeleteFitProfileUseCase', () => {
  let answers: InMemoryAnswers;
  let profiles: InMemoryProfiles;
  let useCase: DeleteFitProfileUseCase;

  beforeEach(() => {
    answers = new InMemoryAnswers();
    profiles = new InMemoryProfiles();
    useCase = new DeleteFitProfileUseCase(answers, profiles);
  });

  it('wipes answers and anonymises the profile for the caller', async () => {
    await answers.saveBatch([
      { userId: 'u-1', questionId: 'q-1', questionSetId: 'qs-1', rawValue: 3 },
      { userId: 'u-1', questionId: 'q-2', questionSetId: 'qs-1', rawValue: 5 },
      { userId: 'u-2', questionId: 'q-3', questionSetId: 'qs-2', rawValue: 4 },
    ]);
    profiles.row = {
      id: 'p-1',
      userId: 'u-1',
      vector: { bigFive: { BIG_FIVE_OPENNESS: 0.8 }, schwartz: {}, sdt: {} },
      version: 1,
      computedAt: new Date(),
      expiresAt: new Date(),
    };

    await useCase.execute('u-1');

    expect(answers.saved.filter((a) => a.userId === 'u-1')).toHaveLength(0);
    expect(answers.saved.filter((a) => a.userId === 'u-2')).toHaveLength(1);
    expect(profiles.row?.vector).toBeNull();
  });

  it('is a no-op when the user has no stored data', async () => {
    await expect(useCase.execute('u-missing')).resolves.toBeUndefined();
  });
});
