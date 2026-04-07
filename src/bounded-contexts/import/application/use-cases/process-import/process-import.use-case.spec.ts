import { beforeEach, describe, expect, it } from 'bun:test';
import { ImportNotFoundException } from '../../../domain/exceptions/import.exceptions';
import { InMemoryImportJobRepository } from '../../../testing/in-memory-import-job.repository';
import { StubResumeCreator } from '../../../testing/stub-resume-creator';
import { sampleJsonResume } from '../../../testing/fixtures/import-job.fixtures';
import { ProcessImportUseCase } from './process-import.use-case';

describe('ProcessImportUseCase', () => {
  let useCase: ProcessImportUseCase;
  let repository: InMemoryImportJobRepository;
  let resumeCreator: StubResumeCreator;

  beforeEach(() => {
    repository = new InMemoryImportJobRepository();
    resumeCreator = new StubResumeCreator();
    useCase = new ProcessImportUseCase(repository, resumeCreator);
  });

  it('should process JSON import and create resume', async () => {
    const job = await repository.create({
      userId: 'user-123',
      source: 'JSON',
      rawData: sampleJsonResume,
    });

    const result = await useCase.execute(job.id);

    expect(result.status).toBe('COMPLETED');
    expect(result.resumeId).toBeDefined();

    const created = resumeCreator.getLastCreated();
    expect(created?.userId).toBe('user-123');
    expect(created?.importId).toBe(job.id);
  });

  it('should update status to COMPLETED after processing', async () => {
    const job = await repository.create({
      userId: 'user-123',
      source: 'JSON',
      rawData: { basics: { name: 'Test' } },
    });

    await useCase.execute(job.id);

    const updated = await repository.findById(job.id);
    expect(updated?.status).toBe('COMPLETED');
  });

  it('should throw ImportNotFoundException for unknown import', async () => {
    await expect(useCase.execute('invalid-id')).rejects.toThrow(ImportNotFoundException);
  });

  it('should fail when no raw data', async () => {
    const job = await repository.create({
      userId: 'user-123',
      source: 'JSON',
    });

    const result = await useCase.execute(job.id);

    expect(result.status).toBe('FAILED');
    expect(result.errors).toContain('No data to import');
  });

  it('should fail when name is missing', async () => {
    const job = await repository.create({
      userId: 'user-123',
      source: 'JSON',
      rawData: { basics: {} },
    });

    const result = await useCase.execute(job.id);

    expect(result.status).toBe('FAILED');
    expect(result.errors).toContain('Name is required');
  });

  it('should store resumeId on completion', async () => {
    const job = await repository.create({
      userId: 'user-123',
      source: 'JSON',
      rawData: { basics: { name: 'Test' } },
    });

    const result = await useCase.execute(job.id);

    const updated = await repository.findById(job.id);
    expect(updated?.resumeId).toBe(result.resumeId);
  });
});
