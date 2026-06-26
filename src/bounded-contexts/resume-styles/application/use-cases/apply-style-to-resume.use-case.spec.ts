import { beforeEach, describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import type { EventPublisher } from '@/shared-kernel';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  ResumeNotFoundForStyleApplyError,
  StyleNotFoundError,
} from '../../domain/exceptions/resume-styles.exceptions';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../domain/ports/resume-style.repository.port';
import type { StyleDetail } from '../../domain/types';
import { ApplyStyleToResumeUseCase } from './apply-style-to-resume.use-case';

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

const styleFixture: StyleDetail = {
  id: 'style-1',
  name: 'Test',
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
  styleScoreBreakdown: {
    buckets: { structure: 35, typography: 30, contrast: 20, decorations: 15 },
    issues: [],
  },
  previewImages: [],
  authorId: 'admin',
};

class FakeRepo extends ResumeStyleRepositoryPort {
  public applied: Array<{ resumeId: string; styleId: string }> = [];
  constructor(
    private readonly seed: StyleDetail | null,
    private readonly applyResult: boolean = true,
  ) {
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
  async applyToResume(resumeId: string, styleId: string): Promise<boolean> {
    if (this.applyResult) this.applied.push({ resumeId, styleId });
    return this.applyResult;
  }
}

describe('ApplyStyleToResumeUseCase', () => {
  let repo: FakeRepo;

  beforeEach(() => {
    repo = new FakeRepo(styleFixture);
  });

  it('throws StyleNotFoundError when the style does not exist', async () => {
    const useCase = new ApplyStyleToResumeUseCase(
      new FakeRepo(null),
      stubEventPublisher,
      stubLogger,
    );
    await expect(
      useCase.execute({ userId: 'u1', resumeId: 'r1', styleId: 'missing' }),
    ).rejects.toBeInstanceOf(StyleNotFoundError);
  });

  it('throws ResumeNotFoundForStyleApplyError when the resume does not exist', async () => {
    const useCase = new ApplyStyleToResumeUseCase(
      new FakeRepo(styleFixture, false),
      stubEventPublisher,
      stubLogger,
    );
    await expect(
      useCase.execute({ userId: 'u1', resumeId: 'missing', styleId: 'style-1' }),
    ).rejects.toBeInstanceOf(ResumeNotFoundForStyleApplyError);
  });

  it('applies the style and records the link', async () => {
    const useCase = new ApplyStyleToResumeUseCase(repo, stubEventPublisher, stubLogger);
    await useCase.execute({ userId: 'u1', resumeId: 'r1', styleId: 'style-1' });
    expect(repo.applied).toEqual([{ resumeId: 'r1', styleId: 'style-1' }]);
  });
});
