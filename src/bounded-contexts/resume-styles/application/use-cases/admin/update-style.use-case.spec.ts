import { beforeEach, describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  StyleBelowAtsThresholdError,
  StyleNotEditableError,
  StyleNotFoundError,
  StyleScoreRegressionError,
} from '../../../domain/exceptions/resume-styles.exceptions';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../../domain/ports/resume-style.repository.port';
import { type StyleScoreBreakdown, StyleScorerPort } from '../../../domain/ports/style-scorer.port';
import type { StyleDetail, UpdateStylePatch } from '../../../domain/types';
import { UpdateStyleUseCase } from './update-style.use-case';

class StubScorer extends StyleScorerPort {
  constructor(private readonly result: StyleScoreBreakdown) {
    super();
  }
  score(): StyleScoreBreakdown {
    return this.result;
  }
  calculateOverallScore(b: StyleScoreBreakdown): number {
    return Math.round((b.layout + b.typography + b.fileLevel) / 3);
  }
}

class FakeRepo extends ResumeStyleRepositoryPort {
  constructor(private readonly seed: StyleDetail | null) {
    super();
  }
  async list(_args?: ListStylesArgs): Promise<PaginatedStyles> {
    return { items: [], total: 0, page: 1, limit: 20 };
  }
  async findById(): Promise<StyleDetail | null> {
    return this.seed;
  }
  async create(): Promise<StyleDetail> {
    throw new Error('not used');
  }
  async update(
    _id: string,
    patch: UpdateStylePatch & { styleScore?: number },
  ): Promise<StyleDetail> {
    if (!this.seed) throw new Error('seed required');
    return {
      ...this.seed,
      styleScore: patch.styleScore ?? this.seed.styleScore,
      version: this.seed.version + 1,
    };
  }
  async delete(): Promise<void> {}
  async applyToResume(): Promise<boolean> {
    return true;
  }
}

const baseStyle: StyleDetail = {
  id: 'style-1',
  name: 'Custom',
  description: null,
  styleScore: 80,
  layoutKind: LayoutKind.SINGLE_COLUMN,
  typstTemplate: 'default',
  isSystem: false,
  thumbnailUrl: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  version: 1,
  styleConfig: {},
  sectionStyles: {},
  atsSafetyBreakdown: { layout: 80, typography: 80, fileLevel: 80 },
  previewImages: [],
  authorId: 'admin-1',
};

describe('UpdateStyleUseCase', () => {
  let scorerHigh: StyleScorerPort;

  beforeEach(() => {
    scorerHigh = new StubScorer({ layout: 90, typography: 90, fileLevel: 90 });
  });

  it('throws StyleNotFoundError when the style is missing', async () => {
    const useCase = new UpdateStyleUseCase(new FakeRepo(null), scorerHigh, stubLogger);
    await expect(useCase.execute('missing', { name: 'x' })).rejects.toBeInstanceOf(
      StyleNotFoundError,
    );
  });

  it('throws StyleNotEditableError on system styles', async () => {
    const useCase = new UpdateStyleUseCase(
      new FakeRepo({ ...baseStyle, isSystem: true }),
      scorerHigh,
      stubLogger,
    );
    await expect(useCase.execute('s', { name: 'x' })).rejects.toBeInstanceOf(StyleNotEditableError);
  });

  it('throws StyleBelowAtsThresholdError when new styleConfig scores below the threshold', async () => {
    const useCase = new UpdateStyleUseCase(
      new FakeRepo(baseStyle),
      new StubScorer({ layout: 50, typography: 50, fileLevel: 50 }),
      stubLogger,
    );
    await expect(useCase.execute('style-1', { styleConfig: {} })).rejects.toBeInstanceOf(
      StyleBelowAtsThresholdError,
    );
  });

  it('throws StyleScoreRegressionError when the new score is below the current one', async () => {
    const useCase = new UpdateStyleUseCase(
      new FakeRepo(baseStyle),
      new StubScorer({ layout: 75, typography: 75, fileLevel: 75 }),
      stubLogger,
    );
    await expect(useCase.execute('style-1', { styleConfig: {} })).rejects.toBeInstanceOf(
      StyleScoreRegressionError,
    );
  });

  it('updates and bumps the version when styleConfig score is monotonic and above threshold', async () => {
    const useCase = new UpdateStyleUseCase(new FakeRepo(baseStyle), scorerHigh, stubLogger);
    const updated = await useCase.execute('style-1', { styleConfig: {} });
    expect(updated.styleScore).toBe(90);
    expect(updated.version).toBe(2);
  });
});
