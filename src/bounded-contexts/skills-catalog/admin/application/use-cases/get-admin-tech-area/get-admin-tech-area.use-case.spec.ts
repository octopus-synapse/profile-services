import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryAdminTechAreasRepository } from '../../../testing/in-memory-admin-tech-areas.repository';
import { GetAdminTechAreaUseCase } from './get-admin-tech-area.use-case';

describe('GetAdminTechAreaUseCase', () => {
  it('throws EntityNotFoundException when the area does not exist', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    await expect(new GetAdminTechAreaUseCase(repo).execute('missing')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
