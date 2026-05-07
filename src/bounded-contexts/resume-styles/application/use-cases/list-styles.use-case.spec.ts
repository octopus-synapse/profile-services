import { describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../domain/ports/resume-style.repository.port';
import type { StyleDetail, StyleSummary } from '../../domain/types';
import { ListStylesUseCase } from './list-styles.use-case';

class FakeRepo extends ResumeStyleRepositoryPort {
  constructor(private readonly snapshot: PaginatedStyles) {
    super();
  }
  async list(_args?: ListStylesArgs): Promise<PaginatedStyles> {
    return this.snapshot;
  }
  async findById(): Promise<StyleDetail | null> {
    return null;
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

describe('ListStylesUseCase', () => {
  it('passes the repository result through unchanged', async () => {
    const sample: StyleSummary = {
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
    };
    const useCase = new ListStylesUseCase(
      new FakeRepo({
        items: [sample],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }),
    );
    const result = await useCase.execute();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('s1');
  });
});
