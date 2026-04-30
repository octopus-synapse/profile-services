import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { UserFitProfileUpdatedEvent } from '../../domain/events';
import { FitAnswerRepositoryPort } from '../../domain/ports/fit-answer.repository.port';
import type { FitQuestionRecord } from '../../domain/ports/fit-question.repository.port';
import { FitQuestionRepositoryPort } from '../../domain/ports/fit-question.repository.port';
import { FitQuestionSetRepositoryPort } from '../../domain/ports/fit-question-set.repository.port';
import { FitRemapHistoryRepositoryPort } from '../../domain/ports/fit-remap-history.repository.port';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
} from '../../domain/ports/user-fit-profile.repository.port';
import { type SampleableQuestion, sampleQuestions } from '../../domain/rules/fit-sampler.rules';
import { type ScoredAnswer, vectoriseAnswers } from '../../domain/rules/fit-vectoriser.rules';
import { FIT_VECTOR_TTL_DAYS, QUESTION_SET_SIZE } from '../../domain/types';

export class FitAnswerCountMismatchError extends Error {
  constructor(expected: number, received: number) {
    super(`Expected ${expected} answers, received ${received}.`);
    this.name = 'FitAnswerCountMismatchError';
  }
}

export class FitQuestionSetNotFoundError extends Error {
  constructor(public readonly questionSetId: string) {
    super(`Fit question set not found: ${questionSetId}`);
    this.name = 'FitQuestionSetNotFoundError';
  }
}

export class FitQuestionSetOwnershipError extends Error {
  constructor() {
    super('Fit question set does not belong to the submitting user.');
    this.name = 'FitQuestionSetOwnershipError';
  }
}

export class FitQuestionSetAlreadyCompletedError extends Error {
  constructor() {
    super('Fit question set has already been submitted.');
    this.name = 'FitQuestionSetAlreadyCompletedError';
  }
}

export class FitAnswerMismatchError extends Error {
  constructor() {
    super('Submitted answers do not align with the sampled question set.');
    this.name = 'FitAnswerMismatchError';
  }
}

export interface SubmitFitAnswersInput {
  readonly userId: string;
  readonly questionSetId: string;
  readonly answers: ReadonlyArray<{ readonly questionId: string; readonly rawValue: number }>;
}

/**
 * Orchestrates the "commit 25 answers → vectorise → persist" pipeline.
 * Writes land in three places:
 *   - `FitAnswer`         (raw Likert responses, one row per question)
 *   - `UserFitProfile`    (upsert of the aggregated vector)
 *   - `FitRemapHistory`   (append-only snapshot for drift analysis)
 * and marks the `FitQuestionSet` completed so subsequent calls to the
 * sampler return a fresh set rather than the one we just closed.
 *
 * The whole operation is not wrapped in a Prisma `$transaction` at this
 * layer — the repositories live behind ports, which means the
 * transaction boundary is an infrastructure concern. The persistence
 * adapter wires it in `prisma-user-fit-profile.repository.ts` as a
 * Prisma interactive transaction in Task #21's seed exercise. For now
 * the ordering is: answers → profile → history → completed, so a
 * crash leaves the user able to retry without duplicate vectors.
 */
export class SubmitFitAnswersUseCase {
  constructor(
    private readonly questionSets: FitQuestionSetRepositoryPort,
    private readonly questions: FitQuestionRepositoryPort,
    private readonly answers: FitAnswerRepositoryPort,
    private readonly profiles: UserFitProfileRepositoryPort,
    private readonly history: FitRemapHistoryRepositoryPort,
    private readonly events: EventPublisher,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    input: SubmitFitAnswersInput,
    now: Date = new Date(),
  ): Promise<SavedUserFitProfile> {
    if (input.answers.length !== QUESTION_SET_SIZE) {
      throw new FitAnswerCountMismatchError(QUESTION_SET_SIZE, input.answers.length);
    }

    const set = await this.questionSets.findById(input.questionSetId);
    if (!set) throw new FitQuestionSetNotFoundError(input.questionSetId);
    if (set.userId !== input.userId) throw new FitQuestionSetOwnershipError();
    if (set.completedAt) throw new FitQuestionSetAlreadyCompletedError();

    // Re-derive the 25 expected IDs from the stored seed rather than
    // persisting them — the sampler is the single source of truth.
    const activePool = await this.questions.listActive();
    const sampleable: SampleableQuestion[] = activePool.map((q) => ({
      id: q.id,
      dimension: q.dimension,
    }));
    const expectedQuestions = sampleQuestions(sampleable, set.seed);
    const expectedIds = new Set(expectedQuestions.map((q) => q.id));

    const submittedIds = new Set(input.answers.map((a) => a.questionId));
    if (
      submittedIds.size !== expectedIds.size ||
      [...submittedIds].some((id) => !expectedIds.has(id))
    ) {
      throw new FitAnswerMismatchError();
    }

    const byId = new Map<string, FitQuestionRecord>();
    for (const q of activePool) byId.set(q.id, q);

    const scored: ScoredAnswer[] = [];
    for (const answer of input.answers) {
      const question = byId.get(answer.questionId);
      if (!question) throw new FitAnswerMismatchError();
      scored.push({
        dimension: question.dimension,
        scaleType: question.scaleType,
        weight: question.weight,
        rawValue: answer.rawValue,
        reverse: question.reverseScored ?? false,
      });
    }

    const vector = vectoriseAnswers(scored);

    await this.answers.saveBatch(
      input.answers.map((a) => ({
        userId: input.userId,
        questionSetId: input.questionSetId,
        questionId: a.questionId,
        rawValue: a.rawValue,
      })),
    );

    const previous = await this.profiles.findByUserId(input.userId);
    const nextVersion = (previous?.version ?? 0) + 1;
    const expiresAt = new Date(now.getTime() + FIT_VECTOR_TTL_DAYS * 24 * 60 * 60 * 1000);

    const saved = await this.profiles.upsert({
      userId: input.userId,
      vector,
      version: nextVersion,
      expiresAt,
    });

    try {
      await this.history.append(input.userId, vector);
    } catch (err) {
      // The history row is append-only telemetry — if it fails the
      // canonical `UserFitProfile` already updated, so we log and move
      // on rather than pretending the commit failed. Task #20's worker
      // reconciles drift from the history table anyway.
      this.logger.warn(
        `Failed to append FitRemapHistory for user ${input.userId}: ${(err as Error).message}`,
        'SubmitFitAnswersUseCase',
      );
    }

    await this.questionSets.markCompleted(input.questionSetId, now);

    // Signal the rest of the app that this user's vector moved. Match
    // Score cache invalidation + downstream notifications subscribe to
    // this event; we keep emission at the very end so a crash earlier
    // in the sequence leaves no phantom recomputes chasing the old
    // vector.
    this.events.publish(
      new UserFitProfileUpdatedEvent(input.userId, { version: nextVersion, cause: 'remap' }),
    );

    return saved;
  }
}
