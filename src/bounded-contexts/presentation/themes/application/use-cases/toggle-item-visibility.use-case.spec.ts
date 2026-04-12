import { beforeEach, describe, expect, it } from 'bun:test';

import type {
  ResumeConfig,
  ResumeConfigRepositoryPort,
} from '../../domain/ports/resume-config.repository.port';
import { ToggleItemVisibilityUseCase } from './toggle-item-visibility.use-case';

describe('ToggleItemVisibilityUseCase', () => {
  let useCase: ToggleItemVisibilityUseCase;
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
    useCase = new ToggleItemVisibilityUseCase(repo);
  });

  it('should add a new item override with visibility set when item does not exist', async () => {
    await useCase.execute('user-1', 'resume-1', 'sec-1', 'item-1', false);

    expect(savedConfig).not.toBeNull();
    expect(savedConfig?.itemOverrides['sec-1']).toEqual([
      { itemId: 'item-1', visible: false, order: 999 },
    ]);
  });

  it('should update visibility of an existing item override', async () => {
    currentConfig = makeConfig({
      itemOverrides: {
        'sec-1': [{ itemId: 'item-1', visible: true, order: 2 }],
      },
    });

    await useCase.execute('user-1', 'resume-1', 'sec-1', 'item-1', false);

    expect(savedConfig?.itemOverrides['sec-1']).toEqual([
      { itemId: 'item-1', visible: false, order: 2 },
    ]);
  });

  it('should set visible to true for a new item override', async () => {
    await useCase.execute('user-1', 'resume-1', 'sec-1', 'item-2', true);

    expect(savedConfig?.itemOverrides['sec-1']).toEqual([
      { itemId: 'item-2', visible: true, order: 999 },
    ]);
  });

  it('should throw when config is not found (ownership check fails)', async () => {
    shouldThrowOnGet = new Error('NotFoundException');

    await expect(useCase.execute('user-1', 'resume-1', 'sec-1', 'item-1', false)).rejects.toThrow(
      'NotFoundException',
    );
    expect(savedConfig).toBeNull();
  });
});
