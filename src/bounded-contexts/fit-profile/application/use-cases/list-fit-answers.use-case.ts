import {
  FitAnswerRepositoryPort,
  type SavedFitAnswer,
} from '../../domain/ports/fit-answer.repository.port';

/**
 * Returns the caller's full Fit Answer history. Used by the
 * questionnaire UI to render a "what you answered last time" panel
 * before the user re-submits a fresh set. Restored in Fase 4 after
 * F2-PD-004 confirmed the feature is wanted.
 */
export class ListFitAnswersUseCase {
  constructor(private readonly fitAnswers: FitAnswerRepositoryPort) {}

  execute(userId: string): Promise<readonly SavedFitAnswer[]> {
    return this.fitAnswers.listByUser(userId);
  }
}
