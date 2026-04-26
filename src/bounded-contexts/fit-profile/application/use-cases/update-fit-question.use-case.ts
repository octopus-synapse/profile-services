import {
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';

export class FitQuestionNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`FitQuestion not found: ${id}`);
    this.name = 'FitQuestionNotFoundError';
  }
}

export class UpdateFitQuestionUseCase {
  constructor(private readonly repository: FitQuestionRepositoryPort) {}

  async execute(id: string, patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    const current = await this.repository.findById(id);
    if (!current) throw new FitQuestionNotFoundError(id);
    return this.repository.update(id, patch);
  }
}
