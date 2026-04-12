import { Inject, Injectable } from '@nestjs/common';
import {
  IMPORT_JOB_REPOSITORY,
  type ImportJobRepositoryPort,
} from '../../../domain/ports/import-job.repository.port';
import type { CreateImportJobParams, ImportJobData } from '../../../domain/types/import.types';

@Injectable()
export class CreateImportJobUseCase {
  constructor(
    @Inject(IMPORT_JOB_REPOSITORY)
    private readonly repository: ImportJobRepositoryPort,
  ) {}

  async execute(params: CreateImportJobParams): Promise<ImportJobData> {
    return this.repository.create(params);
  }
}
