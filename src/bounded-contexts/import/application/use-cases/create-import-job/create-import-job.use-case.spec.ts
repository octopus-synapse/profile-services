import { beforeEach, describe, expect, it } from 'bun:test';
import { InvalidImportDataException } from '../../../domain/exceptions/import.exceptions';
import { InMemoryImportJobRepository } from '../../../testing/in-memory-import-job.repository';
import { CreateImportJobUseCase } from './create-import-job.use-case';

describe('CreateImportJobUseCase', () => {
  let useCase: CreateImportJobUseCase;
  let repository: InMemoryImportJobRepository;

  beforeEach(() => {
    repository = new InMemoryImportJobRepository();
    useCase = new CreateImportJobUseCase(repository);
  });

  it('should create an import job with PENDING status', async () => {
    const result = await useCase.execute({ userId: 'user-123', source: 'JSON' });

    expect(result.id).toBeDefined();
    expect(result.status).toBe('PENDING');
    expect(result.userId).toBe('user-123');
    expect(result.source).toBe('JSON');
  });

  it('should store raw data when provided', async () => {
    const rawData = { basics: { name: 'Test User' } };

    const result = await useCase.execute({ userId: 'user-123', source: 'JSON', rawData });

    const saved = await repository.findById(result.id);
    expect(saved?.rawData).toEqual(rawData);
  });

  it('throws InvalidImportDataException when rawData is not an object payload', async () => {
    await expect(
      useCase.execute({ userId: 'user-123', source: 'JSON', rawData: 'not-an-object' as unknown }),
    ).rejects.toThrow(InvalidImportDataException);
  });

  it('should store fileName when provided', async () => {
    const result = await useCase.execute({
      userId: 'user-123',
      source: 'JSON',
      fileName: 'resume.json',
    });

    expect(result.fileName).toBe('resume.json');
  });
});
