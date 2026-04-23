import { Injectable } from '@nestjs/common';
import {
  type FitQuestionRecord,
  FitQuestionRepositoryPort,
} from '../../domain/ports/fit-question.repository.port';

/** Wraps the repository `findById` so the admin controller never
 * imports the repository port directly (arch rule). */
@Injectable()
export class GetFitQuestionUseCase {
  constructor(private readonly repo: FitQuestionRepositoryPort) {}

  async execute(id: string): Promise<FitQuestionRecord | null> {
    return this.repo.findById(id);
  }
}
