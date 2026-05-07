import { beforeEach, describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { StyleBelowAtsThresholdError } from '../../../domain/exceptions/resume-styles.exceptions';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../../domain/ports/resume-style.repository.port';
import { type StyleScoreBreakdown, StyleScorerPort } from '../../../domain/ports/style-scorer.port';
import type { CreateStyleInput, StyleDetail } from '../../../domain/types';
import { CreateStyleUseCase } from './create-style.use-case';

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
  public created: StyleDetail[] = [];
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
    return null;
  }
  async create(
    input: CreateStyleInput & { styleScore: number; atsSafetyBreakdown: Record<string, number> },
  ): Promise<StyleDetail> {
    const detail: StyleDetail = {
      id: `style-${this.created.length + 1}`,
      name: input.name,
      description: input.description ?? null,
      styleScore: input.styleScore,
      layoutKind: input.layoutKind,
      typstTemplate: input.typstTemplate,
      isSystem: false,
      thumbnailUrl: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      version: 1,
      styleConfig: input.styleConfig,
      sectionStyles: input.sectionStyles ?? {},
      atsSafetyBreakdown: {
        layout: input.atsSafetyBreakdown.layout ?? 0,
        typography: input.atsSafetyBreakdown.typography ?? 0,
        fileLevel: input.atsSafetyBreakdown.fileLevel ?? 0,
        ...input.atsSafetyBreakdown,
      },
      previewImages: [],
      authorId: input.authorId,
    };
    this.created.push(detail);
    return detail;
  }
  async update(): Promise<StyleDetail> {
    throw new Error('not used');
  }
  async delete(): Promise<void> {}
  async applyToResume(): Promise<boolean> {
    return true;
  }
}

const baseInput: CreateStyleInput = {
  name: 'My Style',
  description: null,
  typstTemplate: 'default',
  layoutKind: LayoutKind.SINGLE_COLUMN,
  styleConfig: {},
  authorId: 'admin-1',
};

describe('CreateStyleUseCase', () => {
  let repo: FakeRepo;
  beforeEach(() => {
    repo = new FakeRepo();
  });

  it('creates the style when scorer returns a score above the threshold', async () => {
    const useCase = new CreateStyleUseCase(
      repo,
      new StubScorer({ layout: 90, typography: 85, fileLevel: 80 }),
      stubLogger,
    );
    const created = await useCase.execute(baseInput);
    expect(created.styleScore).toBe(85); // Math.round((90+85+80)/3)
    expect(repo.created).toHaveLength(1);
  });

  it('rejects with StyleBelowAtsThresholdError when score is below the threshold', async () => {
    const useCase = new CreateStyleUseCase(
      repo,
      new StubScorer({ layout: 60, typography: 60, fileLevel: 60 }),
      stubLogger,
    );
    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(StyleBelowAtsThresholdError);
    expect(repo.created).toHaveLength(0);
  });
});
