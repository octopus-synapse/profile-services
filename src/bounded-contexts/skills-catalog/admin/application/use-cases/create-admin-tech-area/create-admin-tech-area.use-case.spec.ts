import { describe, expect, it } from 'bun:test';
import { TechAreaInvalidException } from '../../../../domain/exceptions/skills-catalog.exceptions';
import { InMemoryAdminTechAreasRepository } from '../../../testing/in-memory-admin-tech-areas.repository';
import { CreateAdminTechAreaUseCase } from './create-admin-tech-area.use-case';

describe('CreateAdminTechAreaUseCase', () => {
  it('forwards the input to the repository', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    await new CreateAdminTechAreaUseCase(repo).execute({
      slug: 'backend',
      nameEn: 'Backend',
      namePtBr: 'Backend',
    });
    expect(repo.created).toHaveLength(1);
    expect(repo.created[0]).toMatchObject({ nameEn: 'Backend' });
  });

  it('rejects malformed slugs with TechAreaInvalidException', async () => {
    const repo = new InMemoryAdminTechAreasRepository();
    await expect(
      new CreateAdminTechAreaUseCase(repo).execute({
        slug: 'Bad Slug!',
        nameEn: 'Backend',
        namePtBr: 'Backend',
      }),
    ).rejects.toBeInstanceOf(TechAreaInvalidException);
  });
});
