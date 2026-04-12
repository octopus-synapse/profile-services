import { Inject, Injectable } from '@nestjs/common';
import {
  IMPORT_JOB_REPOSITORY,
  type ImportJobRepositoryPort,
} from '../../../domain/ports/import-job.repository.port';
import type { ImportJobData } from '../../../domain/types/import.types';

@Injectable()
export class ListImportHistoryUseCase {
  constructor(
    @Inject(IMPORT_JOB_REPOSITORY)
    private readonly repository: ImportJobRepositoryPort,
  ) {}

  async execute(userId: string): Promise<ImportJobData[]> {
    return this.repository.findByUserId(userId);
  }
}
