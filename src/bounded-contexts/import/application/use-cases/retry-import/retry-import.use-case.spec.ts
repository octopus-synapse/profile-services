import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ImportCannotBeRetriedException,
  ImportNotFoundException,
} from '../../../domain/exceptions/import.exceptions';
import { InMemoryImportJobRepository } from '../../../testing/in-memory-import-job.repository';
import { StubResumeCreator } from '../../../testing/stub-resume-creator';
import { createImportJobFixture } from '../../../testing/fixtures/import-job.fixtures';
import { RetryImportUseCase } from './retry-import.use-case';

describe('RetryImportUseCase', () => {
  let useCase: RetryImportUseCase;
  let repository: InMemoryImportJobRepository;
  let resumeCreator: StubResumeCreator;

  beforeEach(() => {
    repository = new InMemoryImportJobRepository();
    resumeCreator = new StubResumeCreator();
    useCase = new RetryImportUseCase(repository, resumeCreator);
  });

  it('should retry a failed import', async () => {
    repository.seed(
      createImportJobFixture({
        id: 'failed-1',
        status: 'FAILED',
        rawData: { basics: { name: 'Test' } },
      }),
    );

    const result = await useCase.execute('failed-1');

    expect(result.status).toBe('COMPLETED');
    expect(result.resumeId).toBeDefined();
  });

  it('should throw ImportNotFoundException for unknown import', async () => {
    await expect(useCase.execute('unknown')).rejects.toThrow(ImportNotFoundException);
  });

  it('should throw ImportCannotBeRetriedException for non-failed import', async () => {
    repository.seed(createImportJobFixture({ id: 'completed-1', status: 'COMPLETED' }));

    await expect(useCase.execute('completed-1')).rejects.toThrow(
      ImportCannotBeRetriedException,
    );
  });
});
