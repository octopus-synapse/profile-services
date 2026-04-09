import { Inject, Injectable } from '@nestjs/common';
import {
  ImportCannotBeRetriedException,
  ImportNotFoundException,
} from '../../../domain/exceptions/import.exceptions';
import {
  IMPORT_JOB_REPOSITORY,
  type ImportJobRepositoryPort,
} from '../../../domain/ports/import-job.repository.port';
import { RESUME_CREATOR, type ResumeCreatorPort } from '../../../domain/ports/resume-creator.port';
import type { ImportResult } from '../../../domain/types/import.types';
import { ProcessImportUseCase } from '../process-import/process-import.use-case';

@Injectable()
export class RetryImportUseCase {
  constructor(
    @Inject(IMPORT_JOB_REPOSITORY)
    private readonly repository: ImportJobRepositoryPort,
    @Inject(RESUME_CREATOR)
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
