import {
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';

/** Admin read — returns every question in the pool, active or not.
 * The user-facing 25-question path uses `listActive` on the repository
 * directly via `GetOrCreateQuestionSetUseCase`, not this one. */
export class ListFitQuestionsUseCase {
  constructor(private readonly repository: FitQuestionRepositoryPort) {}

  async execute(): Promise<readonly FitQuestionRecord[]> {
    return this.repository.listAll();
  }
}
