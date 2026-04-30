import { FitQuestionNotFoundException } from '../../domain/exceptions/fit-profile.exceptions';
import { FitQuestionRepositoryPort } from '../../domain/ports/fit-question.repository.port';

export class DeleteFitQuestionUseCase {
  constructor(private readonly repository: FitQuestionRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const current = await this.repository.findById(id);
    if (!current) throw new FitQuestionNotFoundException(id);
    await this.repository.delete(id);
  }
}
