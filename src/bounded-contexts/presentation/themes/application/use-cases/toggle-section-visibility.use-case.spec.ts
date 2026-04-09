import { beforeEach, describe, expect, it } from 'bun:test';

import type {
  ResumeConfig,
  ResumeConfigRepositoryPort,
} from '../../domain/ports/resume-config.repository.port';
import { ToggleSectionVisibilityUseCase } from './toggle-section-visibility.use-case';

describe('ToggleSectionVisibilityUseCase', () => {
  let useCase: ToggleSectionVisibilityUseCase;
  let savedConfig: ResumeConfig | null;
  let shouldThrowOnGet: Error | null;

  const makeConfig = (overrides: Partial<ResumeConfig> = {}): ResumeConfig => ({
    sections: [
      { id: 'sec-1', visible: true, order: 0, column: 'left' },
      { id: 'sec-2', visible: true, order: 1, column: 'right' },
    ],
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
    useCase = new ToggleSectionVisibilityUseCase(repo);
  });

  it('should hide a visible section', async () => {
    await useCase.execute('user-1', 'resume-1', 'sec-1', false);

    expect(savedConfig).not.toBeNull();
    const section = savedConfig!.sections.find((s) => s.id === 'sec-1');
    expect(section?.visible).toBe(false);
  });

  it('should show a hidden section', async () => {
    currentConfig = makeConfig({
      sections: [
        { id: 'sec-1', visible: false, order: 0, column: 'left' },
        { id: 'sec-2', visible: true, order: 1, column: 'right' },
      ],
    });

    await useCase.execute('user-1', 'resume-1', 'sec-1', true);

    const section = savedConfig!.sections.find((s) => s.id === 'sec-1');
    expect(section?.visible).toBe(true);
  });

  it('should not modify other sections', async () => {
    await useCase.execute('user-1', 'resume-1', 'sec-1', false);

    const otherSection = savedConfig!.sections.find((s) => s.id === 'sec-2');
    expect(otherSection?.visible).toBe(true);
  });

  it('should throw when config is not found (ownership check fails)', async () => {
    shouldThrowOnGet = new Error('NotFoundException');

    await expect(useCase.execute('user-1', 'resume-1', 'sec-1', false)).rejects.toThrow(
      'NotFoundException',
    );
    expect(savedConfig).toBeNull();
  });
});
