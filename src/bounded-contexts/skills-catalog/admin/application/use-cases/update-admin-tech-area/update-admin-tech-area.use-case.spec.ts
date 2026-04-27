import { describe, expect, it } from 'bun:test';
import type { TechArea } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryAdminTechAreasRepository } from '../../../testing/in-memory-admin-tech-areas.repository';
import { UpdateAdminTechAreaUseCase } from './update-admin-tech-area.use-case';

describe('UpdateAdminTechAreaUseCase', () => {
  it('updates an existing area', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    repo.seed({ id: 'a-1', nameEn: 'old' } as unknown as TechArea);
    await new UpdateAdminTechAreaUseCase(repo).execute('a-1', { nameEn: 'new' });
    expect(repo.updated[0]).toEqual({ id: 'a-1', input: { nameEn: 'new' } });
  });

  it('throws when missing', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    await expect(new UpdateAdminTechAreaUseCase(repo).execute('x', {})).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
