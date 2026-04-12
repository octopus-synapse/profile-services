import { beforeEach, describe, expect, it } from 'bun:test';

import type {
  ResumeConfig,
  ResumeConfigRepositoryPort,
} from '../../domain/ports/resume-config.repository.port';
import { ReorderItemUseCase } from './reorder-item.use-case';

describe('ReorderItemUseCase', () => {
  let useCase: ReorderItemUseCase;
  let savedConfig: ResumeConfig | null;
  let shouldThrowOnGet: Error | null;

  const makeConfig = (overrides: Partial<ResumeConfig> = {}): ResumeConfig => ({
    sections: [{ id: 'sec-1', visible: true, order: 0, column: 'left' }],
    itemOverrides: {},
    ...overrides,
  });

  let currentConfig: ResumeConfig;

  const repo = {
    get: async (_userId: string, _resumeId: string) => {
      if (shouldThrowOnGet) throw shouldThrowOnGet;
      return currentConfig;
    },
    save: async (_resumeId: string, config: ResumeConfig) => {
      savedConfig = config;
    },
    reorderSectionDirect: async () => {},
    batchUpdateSectionsDirect: async () => {},
  } as unknown as ResumeConfigRepositoryPort;

  beforeEach(() => {
    savedConfig = null;
    shouldThrowOnGet = null;
    currentConfig = makeConfig();
    useCase = new ReorderItemUseCase(repo);
  });

  it('should add a new item override when item does not exist', async () => {
    await useCase.execute('user-1', 'resume-1', 'sec-1', 'item-1', 5);

    expect(savedConfig).not.toBeNull();
    expect(savedConfig?.itemOverrides['sec-1']).toEqual([
      { itemId: 'item-1', visible: true, order: 5 },
    ]);
  });

  it('should update order of an existing item override', async () => {
    currentConfig = makeConfig({
      itemOverrides: {
        'sec-1': [{ itemId: 'item-1', visible: false, order: 0 }],
      },
    });

    await useCase.execute('user-1', 'resume-1', 'sec-1', 'item-1', 10);

    expect(savedConfig?.itemOverrides['sec-1']).toEqual([
      { itemId: 'item-1', visible: false, order: 10 },
    ]);
  });

  it('should throw when config is not found (ownership check fails)', async () => {
    shouldThrowOnGet = new Error('NotFoundException');

    await expect(useCase.execute('user-1', 'resume-1', 'sec-1', 'item-1', 5)).rejects.toThrow(
      'NotFoundException',
    );
    expect(savedConfig).toBeNull();
  });
});
