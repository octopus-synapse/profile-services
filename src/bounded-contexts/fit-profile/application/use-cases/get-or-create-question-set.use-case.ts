import {
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';
import {
  FitQuestionSetRepositoryPort,
  type SavedFitQuestionSet,
} from '../../domain/ports/fit-question-set.repository.port';
import {
  buildQuestionSetSeed,
  type SampleableQuestion,
  sampleQuestions,
} from '../../domain/rules/fit-sampler.rules';

export interface QuestionSetView {
  readonly set: SavedFitQuestionSet;
  readonly questions: readonly FitQuestionRecord[];
}

export class EmptyFitQuestionPoolError extends Error {
  constructor() {
    super('No active FitQuestions in the pool — cannot sample a question set.');
    this.name = 'EmptyFitQuestionPoolError';
  }
}

/**
 * Returns the active (uncompleted) 25-question set for a user, creating
 * one idempotently when needed. The seed combines `userId` with the
 * current remap generation so refreshing the questionnaire page mid-
 * answer returns the exact same 25 rows.
 *
 * The 25 question IDs are re-derived deterministically from `seed` +
 * the active pool via `sampleQuestions` — we don't persist them, so
 * the sampler is the single source of truth for question-set content.
 */
export class GetOrCreateQuestionSetUseCase {
  constructor(
    private readonly questions: FitQuestionRepositoryPort,
    private readonly questionSets: FitQuestionSetRepositoryPort,
  ) {}

  async execute(userId: string): Promise<QuestionSetView> {
    const pool = await this.questions.listActive();
    if (pool.length === 0) throw new EmptyFitQuestionPoolError();

    const existing = await this.questionSets.findOpenByUserId(userId);
    if (existing) {
      const questions = this.sampleFromPool(pool, existing.seed);
      return { set: existing, questions };
    }

    // Generation is the number of sets the user has attempted — makes
    // the seed change on every remap automatically.
    const generation = (await this.questionSets.countByUser(userId)) + 1;
    const seed = buildQuestionSetSeed(userId, generation);

    const set = await this.questionSets.create({ userId, seed });
    const questions = this.sampleFromPool(pool, seed);
    return { set, questions };
  }

  private sampleFromPool(
    pool: readonly FitQuestionRecord[],
    seed: string,
  ): readonly FitQuestionRecord[] {
    const sampleable: SampleableQuestion[] = pool.map((q) => ({
      id: q.id,
      dimension: q.dimension,
    }));
    const sampled = sampleQuestions(sampleable, seed);

    const byId = new Map<string, FitQuestionRecord>();
    for (const q of pool) byId.set(q.id, q);

    const result: FitQuestionRecord[] = [];
    for (const s of sampled) {
      const row = byId.get(s.id);
      if (row) result.push(row);
    }
    return result;
  }
}
