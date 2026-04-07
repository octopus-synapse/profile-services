import { beforeEach, describe, expect, it } from 'bun:test';
import { ImportNotFoundException } from '../../../domain/exceptions/import.exceptions';
import { InMemoryImportJobRepository } from '../../../testing/in-memory-import-job.repository';
import { GetImportStatusUseCase } from './get-import-status.use-case';

describe('GetImportStatusUseCase', () => {
  let useCase: GetImportStatusUseCase;
  let repository: InMemoryImportJobRepository;

  beforeEach(() => {
    repository = new InMemoryImportJobRepository();
    useCase = new GetImportStatusUseCase(repository);
  });

  it('should return import job by id', async () => {
    const job = await repository.create({ userId: 'user-123', source: 'JSON' });

    const result = await useCase.execute(job.id);

    expect(result.id).toBe(job.id);
    expect(result.status).toBe('PENDING');
  });

  it('should throw ImportNotFoundException for unknown id', async () => {
    await expect(useCase.execute('unknown')).rejects.toThrow(ImportNotFoundException);
  });
});
