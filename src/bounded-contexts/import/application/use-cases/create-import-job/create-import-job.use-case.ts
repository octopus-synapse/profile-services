import { InvalidImportDataException } from '../../../domain/exceptions/import.exceptions';
import { ImportJobRepositoryPort } from '../../../domain/ports/import-job.repository.port';
import type { CreateImportJobParams, ImportJobData } from '../../../domain/types/import.types';

export class CreateImportJobUseCase {
  constructor(private readonly repository: ImportJobRepositoryPort) {}

  async execute(params: CreateImportJobParams): Promise<ImportJobData> {
    if (params.rawData !== undefined && params.rawData !== null) {
      if (typeof params.rawData !== 'object' || Array.isArray(params.rawData)) {
        throw new InvalidImportDataException(
          'rawData must be an object payload (e.g. JSON Resume schema)',
        );
      }
    }
    return this.repository.create(params);
  }
}
