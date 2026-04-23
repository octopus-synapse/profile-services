import { Injectable } from '@nestjs/common';
import {
  type FitQuestionInput,
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';

@Injectable()
export class CreateFitQuestionUseCase {
  constructor(private readonly repository: FitQuestionRepositoryPort) {}

  async execute(input: FitQuestionInput): Promise<FitQuestionRecord> {
    return this.repository.create(input);
  }
}
