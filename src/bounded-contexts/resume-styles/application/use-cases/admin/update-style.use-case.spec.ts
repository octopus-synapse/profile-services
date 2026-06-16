import { beforeEach, describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  StyleBelowAtsThresholdError,
  StyleNotEditableError,
  StyleNotFoundError,
} from '../../../domain/exceptions/resume-styles.exceptions';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../../domain/ports/resume-style.repository.port';
import { StyleScorerPort } from '../../../domain/ports/style-scorer.port';
import type {
  StyleDetail,
  StyleScoreBreakdownData,
  StyleScoreResult,
  UpdateStylePatch,
} from '../../../domain/types';
import { UpdateStyleUseCase } from './update-style.use-case';

class StubScorer extends StyleScorerPort {
  constructor(private readonly result: StyleScoreResult) {
    super();
  }
  async score(): Promise<StyleScoreResult> {
    return this.result;
  }
}

const stubResult = (overall: number): StyleScoreResult => ({
  overall,
  breakdown: { structure: overall },
  issues: [],
});

class FakeRepo extends ResumeStyleRepositoryPort {
  constructor(private readonly seed: StyleDetail | null) {
    super();
  }
  async list(_args?: ListStylesArgs): Promise<PaginatedStyles> {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    };
  }
  async findById(): Promise<StyleDetail | null> {
    return this.seed;
  }
  async create(): Promise<StyleDetail> {
    throw new Error('not used');
  }
  async update(
    _id: string,
    patch: UpdateStylePatch & {
      styleScore?: number;
      styleScoreBreakdown?: StyleScoreBreakdownData;
    },
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
  styleScore: 90,
  layoutKind: LayoutKind.SINGLE_COLUMN,
  typstTemplate: 'default',
  isSystem: false,
  thumbnailUrl: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  version: 1,
  styleConfig: {},
  sectionStyles: {},
  styleScoreBreakdown: {
    buckets: { structure: 35, typography: 30, contrast: 20, decorations: 15 },
    issues: [],
  },
  previewImages: [],
  authorId: 'admin-1',
};

describe('UpdateStyleUseCase', () => {
  let scorerHigh: StyleScorerPort;

  beforeEach(() => {
    scorerHigh = new StubScorer(stubResult(95));
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
      new StubScorer(stubResult(50)),
      stubLogger,
    );
    await expect(useCase.execute('style-1', { styleConfig: {} })).rejects.toBeInstanceOf(
      StyleBelowAtsThresholdError,
    );
  });

  it('allows the score to decrease as long as it stays above the threshold', async () => {
    // No monotonic invariant anymore: 90 → 82 is a valid edit.
    const useCase = new UpdateStyleUseCase(
      new FakeRepo(baseStyle),
      new StubScorer(stubResult(82)),
      stubLogger,
    );
    const updated = await useCase.execute('style-1', { styleConfig: {} });
    expect(updated.styleScore).toBe(82);
    expect(updated.version).toBe(2);
  });

  it('updates and bumps the version when styleConfig scores above threshold', async () => {
    const useCase = new UpdateStyleUseCase(new FakeRepo(baseStyle), scorerHigh, stubLogger);
    const updated = await useCase.execute('style-1', { styleConfig: {} });
    expect(updated.styleScore).toBe(95);
    expect(updated.version).toBe(2);
  });
});
