import { describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { StyleNotFoundError } from '../../domain/exceptions/resume-styles.exceptions';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../domain/ports/resume-style.repository.port';
import { type StylePreviewInput, StylePreviewPort } from '../../domain/ports/style-preview.port';
import type { StyleDetail } from '../../domain/types';
import { PreviewStyleUseCase } from './preview-style.use-case';

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

class FakePreview extends StylePreviewPort {
  public calls: StylePreviewInput[] = [];
  async render(input: StylePreviewInput): Promise<Buffer> {
    this.calls.push(input);
    return Buffer.from('PDF');
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
  styleConfig: { foo: 'bar' },
  sectionStyles: {},
  styleScoreBreakdown: { buckets: { structure: 35, typography: 30, contrast: 20, decorations: 15 }, issues: [] },
  previewImages: [],
  authorId: 'admin',
};

describe('PreviewStyleUseCase', () => {
  it('renders via the preview port with the user, style template + config', async () => {
    const preview = new FakePreview();
    const useCase = new PreviewStyleUseCase(new FakeRepo(sample), preview, stubLogger);
    const buf = await useCase.execute('s1', 'u1');
    expect(buf.toString()).toBe('PDF');
    expect(preview.calls).toEqual([
      { userId: 'u1', typstTemplate: 'default', styleConfig: { foo: 'bar' } },
    ]);
  });

  it('throws StyleNotFoundError when the style is missing', async () => {
    const useCase = new PreviewStyleUseCase(new FakeRepo(null), new FakePreview(), stubLogger);
    await expect(useCase.execute('missing', 'u1')).rejects.toBeInstanceOf(StyleNotFoundError);
  });
});
