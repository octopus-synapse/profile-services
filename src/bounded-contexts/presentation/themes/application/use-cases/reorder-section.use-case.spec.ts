import { beforeEach, describe, expect, it } from 'bun:test';

import type {
  ResumeConfig,
  ResumeConfigRepositoryPort,
} from '../../domain/ports/resume-config.repository.port';
import { ReorderSectionUseCase } from './reorder-section.use-case';

describe('ReorderSectionUseCase', () => {
  let useCase: ReorderSectionUseCase;
  let getCalled: { userId: string; resumeId: string } | null;
  let reorderCalled: { resumeId: string; sectionId: string; newOrder: number } | null;
  let shouldThrowOnGet: Error | null;

  const fakeConfig: ResumeConfig = {
    sections: [{ id: 'sec-1', visible: true, order: 0, column: 'left' }],
    itemOverrides: {},
  };

  const repo = {
    get: async (userId: string, resumeId: string) => {
      getCalled = { userId, resumeId };
      if (shouldThrowOnGet) throw shouldThrowOnGet;
      return { ...fakeConfig };
    },
    reorderSectionDirect: async (resumeId: string, sectionId: string, newOrder: number) => {
      reorderCalled = { resumeId, sectionId, newOrder };
    },
    save: async () => {},
    batchUpdateSectionsDirect: async () => {},
  } as unknown as ResumeConfigRepositoryPort;

  beforeEach(() => {
    getCalled = null;
    reorderCalled = null;
    shouldThrowOnGet = null;
    useCase = new ReorderSectionUseCase(repo);
  });

  it('should reorder a section successfully', async () => {
    await useCase.execute('user-1', 'resume-1', 'sec-1', 3);

    expect(getCalled).toEqual({ userId: 'user-1', resumeId: 'resume-1' });
    expect(reorderCalled).toEqual({ resumeId: 'resume-1', sectionId: 'sec-1', newOrder: 3 });
  });

  it('should throw when config is not found (ownership check fails)', async () => {
    shouldThrowOnGet = new Error('NotFoundException');

    await expect(useCase.execute('user-1', 'resume-1', 'sec-1', 3)).rejects.toThrow(
      'NotFoundException',
    );
    expect(reorderCalled).toBeNull();
  });
});
