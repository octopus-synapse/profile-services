import { describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import { StyleNotFoundError } from '../../domain/exceptions/resume-styles.exceptions';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../domain/ports/resume-style.repository.port';
import type { StyleDetail } from '../../domain/types';
import { GetStyleUseCase } from './get-style.use-case';

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
  async update(): Promise<StyleDetail> {
    throw new Error('not used');
  }
  async delete(): Promise<void> {}
  async applyToResume(): Promise<boolean> {
    return true;
  }
}

const sample: StyleDetail = {
  id: 's1',
  name: 'X',
  description: null,
  styleScore: 80,
  layoutKind: LayoutKind.SINGLE_COLUMN,
  typstTemplate: 'default',
  isSystem: true,
  thumbnailUrl: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  version: 1,
  styleConfig: {},
  sectionStyles: {},
  atsSafetyBreakdown: { layout: 80, typography: 80, fileLevel: 80 },
  previewImages: [],
  authorId: 'admin',
};

describe('GetStyleUseCase', () => {
  it('returns the row when present', async () => {
    const useCase = new GetStyleUseCase(new FakeRepo(sample));
    const result = await useCase.execute('s1');
    expect(result.id).toBe('s1');
  });

  it('throws StyleNotFoundError when the row is missing', async () => {
    const useCase = new GetStyleUseCase(new FakeRepo(null));
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(StyleNotFoundError);
  });
});
