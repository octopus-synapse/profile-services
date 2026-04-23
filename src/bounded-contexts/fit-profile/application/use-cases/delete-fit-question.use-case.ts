import { Injectable } from '@nestjs/common';
import { FitQuestionRepositoryPort } from '../../domain/ports/fit-question.repository.port';
import { FitQuestionNotFoundError } from './update-fit-question.use-case';

@Injectable()
export class DeleteFitQuestionUseCase {
  constructor(private readonly repository: FitQuestionRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const current = await this.repository.findById(id);
    if (!current) throw new FitQuestionNotFoundError(id);
    await this.repository.delete(id);
  }
}
