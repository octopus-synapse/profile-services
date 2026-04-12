import { Inject, Injectable } from '@nestjs/common';
import {
  ImportCannotBeCancelledException,
  ImportNotFoundException,
} from '../../../domain/exceptions/import.exceptions';
import {
  IMPORT_JOB_REPOSITORY,
  type ImportJobRepositoryPort,
} from '../../../domain/ports/import-job.repository.port';

@Injectable()
export class CancelImportUseCase {
  constructor(
    @Inject(IMPORT_JOB_REPOSITORY)
    private readonly repository: ImportJobRepositoryPort,
  ) {}

  async execute(importId: string): Promise<void> {
    const job = await this.repository.findById(importId);
    if (!job) {
      throw new ImportNotFoundException(importId);
    }
    if (job.status === 'COMPLETED') {
      throw new ImportCannotBeCancelledException(importId);
    }
    await this.repository.delete(importId);
  }
}
