import { describe, expect, it } from 'bun:test';
import type { TechArea } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { TechAreaInUseException } from '../../../../domain/exceptions/skills-catalog.exceptions';
import { InMemoryAdminTechAreasRepository } from '../../../testing/in-memory-admin-tech-areas.repository';
import { DeleteAdminTechAreaUseCase } from './delete-admin-tech-area.use-case';

describe('DeleteAdminTechAreaUseCase', () => {
  it('deletes an area with no niches', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    repo.seed({ id: 'a-1' } as unknown as TechArea);
    await new DeleteAdminTechAreaUseCase(repo).execute('a-1');
    expect(repo.deleted).toEqual(['a-1']);
  });

  it('blocks deletion when niches still reference the area', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    repo.seed({ id: 'a-1' } as unknown as TechArea);
    repo.setNicheCount('a-1', 3);
    await expect(new DeleteAdminTechAreaUseCase(repo).execute('a-1')).rejects.toBeInstanceOf(
      TechAreaInUseException,
    );
  });

  it('throws EntityNotFoundException when missing', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    await expect(new DeleteAdminTechAreaUseCase(repo).execute('x')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
