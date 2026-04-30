import { FitQuestionNotFoundException } from '../../domain/exceptions/fit-profile.exceptions';
import {
  type FitQuestionPatch,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';

export class UpdateFitQuestionUseCase {
  constructor(private readonly repository: FitQuestionRepositoryPort) {}

  async execute(id: string, patch: FitQuestionPatch): Promise<FitQuestionRecord> {
    const current = await this.repository.findById(id);
    if (!current) throw new FitQuestionNotFoundException(id);
    return this.repository.update(id, patch);
  }
}
