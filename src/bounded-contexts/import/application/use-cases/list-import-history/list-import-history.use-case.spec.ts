import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryImportJobRepository } from '../../../testing/in-memory-import-job.repository';
import { ListImportHistoryUseCase } from './list-import-history.use-case';

describe('ListImportHistoryUseCase', () => {
  let useCase: ListImportHistoryUseCase;
  let repository: InMemoryImportJobRepository;

  beforeEach(() => {
    repository = new InMemoryImportJobRepository();
    useCase = new ListImportHistoryUseCase(repository);
  });

  it('should return import history for user', async () => {
    await repository.create({ userId: 'user-123', source: 'JSON' });
    await repository.create({ userId: 'user-123', source: 'JSON' });
    await repository.create({ userId: 'other-user', source: 'JSON' });

    const history = await useCase.execute('user-123');

    expect(history).toHaveLength(2);
    expect(history.every((j) => j.userId === 'user-123')).toBe(true);
  });

  it('should return empty array for user with no imports', async () => {
    const history = await useCase.execute('user-123');
    expect(history).toHaveLength(0);
  });
});
