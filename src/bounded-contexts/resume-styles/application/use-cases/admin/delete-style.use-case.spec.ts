import { describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import {
  StyleNotEditableError,
  StyleNotFoundError,
} from '../../../domain/exceptions/resume-styles.exceptions';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../../domain/ports/resume-style.repository.port';
import type { StyleDetail } from '../../../domain/types';
import { DeleteStyleUseCase } from './delete-style.use-case';

class FakeRepo extends ResumeStyleRepositoryPort {
  public deletedIds: string[] = [];
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
  async delete(id: string): Promise<void> {
    this.deletedIds.push(id);
  }
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
  isSystem: false,
  thumbnailUrl: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  version: 1,
  styleConfig: {},
  sectionStyles: {},
  styleScoreBreakdown: { buckets: { structure: 35, typography: 30, contrast: 20, decorations: 15 }, issues: [] },
  previewImages: [],
  authorId: 'admin',
};

describe('DeleteStyleUseCase', () => {
  it('throws StyleNotFoundError when missing', async () => {
    const useCase = new DeleteStyleUseCase(new FakeRepo(null));
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(StyleNotFoundError);
  });

  it('throws StyleNotEditableError on system styles', async () => {
    const useCase = new DeleteStyleUseCase(new FakeRepo({ ...sample, isSystem: true }));
    await expect(useCase.execute('s1')).rejects.toBeInstanceOf(StyleNotEditableError);
  });

  it('deletes a non-system style', async () => {
    const repo = new FakeRepo(sample);
    const useCase = new DeleteStyleUseCase(repo);
    await useCase.execute('s1');
    expect(repo.deletedIds).toEqual(['s1']);
  });
});
