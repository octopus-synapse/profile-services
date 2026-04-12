import { Inject, Injectable } from '@nestjs/common';
import { ImportNotFoundException } from '../../../domain/exceptions/import.exceptions';
import {
  IMPORT_JOB_REPOSITORY,
  type ImportJobRepositoryPort,
} from '../../../domain/ports/import-job.repository.port';
import type { ImportJobData } from '../../../domain/types/import.types';

@Injectable()
export class GetImportStatusUseCase {
  constructor(
    @Inject(IMPORT_JOB_REPOSITORY)
    private readonly repository: ImportJobRepositoryPort,
  ) {}

  async execute(importId: string): Promise<ImportJobData> {
    const job = await this.repository.findById(importId);
    if (!job) {
      throw new ImportNotFoundException(importId);
    }
    return job;
  }
}
