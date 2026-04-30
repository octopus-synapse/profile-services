import { ImportNotFoundException } from '../../../domain/exceptions/import.exceptions';
import { ImportJobRepositoryPort } from '../../../domain/ports/import-job.repository.port';
import type { ImportJobData } from '../../../domain/types/import.types';

export class GetImportStatusUseCase {
  constructor(private readonly repository: ImportJobRepositoryPort) {}

  async execute(importId: string): Promise<ImportJobData> {
    const job = await this.repository.findById(importId);
    if (!job) {
      throw new ImportNotFoundException(importId);
    }
    return job;
  }
}
