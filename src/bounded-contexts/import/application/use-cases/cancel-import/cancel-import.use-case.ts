import {
  ImportCannotBeCancelledException,
  ImportNotFoundException,
} from '../../../domain/exceptions/import.exceptions';
import { ImportJobRepositoryPort } from '../../../domain/ports/import-job.repository.port';

export class CancelImportUseCase {
  constructor(private readonly repository: ImportJobRepositoryPort) {}

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
