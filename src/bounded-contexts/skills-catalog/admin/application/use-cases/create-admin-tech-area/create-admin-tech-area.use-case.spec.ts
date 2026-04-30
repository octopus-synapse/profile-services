import { describe, expect, it } from 'bun:test';
import { InMemoryAdminTechAreasRepository } from '../../../testing/in-memory-admin-tech-areas.repository';
import { CreateAdminTechAreaUseCase } from './create-admin-tech-area.use-case';

describe('CreateAdminTechAreaUseCase', () => {
  it('forwards the input to the repository', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    await new CreateAdminTechAreaUseCase(repo).execute({ nameEn: 'Backend', namePtBr: 'Backend' });
    expect(repo.created).toHaveLength(1);
    expect(repo.created[0]).toMatchObject({ nameEn: 'Backend' });
  });
});
