import { ImportJobRepositoryPort } from '../../../domain/ports/import-job.repository.port';
import type { ImportJobData } from '../../../domain/types/import.types';

export class ListImportHistoryUseCase {
  constructor(private readonly repository: ImportJobRepositoryPort) {}

  async execute(userId: string): Promise<ImportJobData[]> {
    return this.repository.findByUserId(userId);
  }
}
