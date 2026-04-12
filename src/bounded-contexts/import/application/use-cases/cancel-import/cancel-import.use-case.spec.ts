import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ImportCannotBeCancelledException,
  ImportNotFoundException,
} from '../../../domain/exceptions/import.exceptions';
import { createImportJobFixture } from '../../../testing/fixtures/import-job.fixtures';
import { InMemoryImportJobRepository } from '../../../testing/in-memory-import-job.repository';
import { CancelImportUseCase } from './cancel-import.use-case';

describe('CancelImportUseCase', () => {
  let useCase: CancelImportUseCase;
  let repository: InMemoryImportJobRepository;

  beforeEach(() => {
    repository = new InMemoryImportJobRepository();
    useCase = new CancelImportUseCase(repository);
  });

  it('should cancel a pending import', async () => {
    const job = await repository.create({ userId: 'user-123', source: 'JSON' });

    await useCase.execute(job.id);

    const deleted = await repository.findById(job.id);
    expect(deleted).toBeNull();
  });

  it('should throw ImportNotFoundException for unknown import', async () => {
    await expect(useCase.execute('unknown')).rejects.toThrow(ImportNotFoundException);
  });

  it('should throw ImportCannotBeCancelledException for completed import', async () => {
    repository.seed(createImportJobFixture({ id: 'completed-1', status: 'COMPLETED' }));

    await expect(useCase.execute('completed-1')).rejects.toThrow(ImportCannotBeCancelledException);
  });
});
