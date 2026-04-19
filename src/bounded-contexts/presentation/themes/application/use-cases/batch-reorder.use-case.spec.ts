import { beforeEach, describe, expect, it } from 'bun:test';

import {
  type ResumeConfig,
  ResumeConfigRepositoryPort,
} from '../../domain/ports/resume-config.repository.port';
import { BatchReorderUseCase } from './batch-reorder.use-case';

describe('BatchReorderUseCase', () => {
  let useCase: BatchReorderUseCase;
  let getCalled: { userId: string; resumeId: string } | null;
  let batchUpdateCalled: { resumeId: string; updates: unknown[] } | null;
  let shouldThrowOnGet: Error | null;

  const fakeConfig: ResumeConfig = {
    sections: [
      { id: 'sec-1', visible: true, order: 0, column: 'left' },
      { id: 'sec-2', visible: true, order: 1, column: 'right' },
    ],
    itemOverrides: {},
  };

  const repo: ResumeConfigRepositoryPort = {
    get: async (userId: string, resumeId: string) => {
      getCalled = { userId, resumeId };
      if (shouldThrowOnGet) throw shouldThrowOnGet;
      return { ...fakeConfig };
    },
    batchUpdateSectionsDirect: async (
      resumeId: string,
      updates: Array<{ id: string; order?: number; visible?: boolean }>,
    ) => {
      batchUpdateCalled = { resumeId, updates };
    },
    save: async () => {},
    reorderSectionDirect: async () => {},
  };

  beforeEach(() => {
    getCalled = null;
    batchUpdateCalled = null;
    shouldThrowOnGet = null;
    useCase = new BatchReorderUseCase(repo);
  });

  it('should batch reorder sections successfully', async () => {
    const updates = [
      { id: 'sec-1', order: 1, visible: true },
      { id: 'sec-2', order: 0, column: 'left' },
    ];

    await useCase.execute('user-1', 'resume-1', updates);

    expect(getCalled).toEqual({ userId: 'user-1', resumeId: 'resume-1' });
    expect(batchUpdateCalled).toEqual({ resumeId: 'resume-1', updates });
  });

  it('should throw when config is not found (ownership check fails)', async () => {
    shouldThrowOnGet = new Error('NotFoundException');

    await expect(useCase.execute('user-1', 'resume-1', [])).rejects.toThrow('NotFoundException');
    expect(batchUpdateCalled).toBeNull();
  });
});
