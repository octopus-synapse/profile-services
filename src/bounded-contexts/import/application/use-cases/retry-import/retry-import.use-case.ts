import {
  ImportCannotBeRetriedException,
  ImportNotFoundException,
} from '../../../domain/exceptions/import.exceptions';
import { ImportJobRepositoryPort } from '../../../domain/ports/import-job.repository.port';
import { ResumeCreatorPort } from '../../../domain/ports/resume-creator.port';
import type { ImportResult } from '../../../domain/types/import.types';
import { ProcessImportUseCase } from '../process-import/process-import.use-case';

export class RetryImportUseCase {
  constructor(
    private readonly repository: ImportJobRepositoryPort,
    private readonly resumeCreator: ResumeCreatorPort,
  ) {}

  async execute(importId: string): Promise<ImportResult> {
    const job = await this.repository.findById(importId);
    if (!job) {
      throw new ImportNotFoundException(importId);
    }
    if (job.status !== 'FAILED') {
      throw new ImportCannotBeRetriedException(importId);
    }

    await this.repository.updateStatus(importId, 'PENDING');

    const processUseCase = new ProcessImportUseCase(this.repository, this.resumeCreator);
    return processUseCase.execute(importId);
  }
}
