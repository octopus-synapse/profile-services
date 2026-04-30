import { ImportJobRepositoryPort } from '../../../domain/ports/import-job.repository.port';
import type { CreateImportJobParams, ImportJobData } from '../../../domain/types/import.types';

export class CreateImportJobUseCase {
  constructor(private readonly repository: ImportJobRepositoryPort) {}

  async execute(params: CreateImportJobParams): Promise<ImportJobData> {
    return this.repository.create(params);
  }
}
