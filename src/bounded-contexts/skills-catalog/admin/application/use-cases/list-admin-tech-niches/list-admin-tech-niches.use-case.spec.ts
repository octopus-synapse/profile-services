import { describe, expect, it } from 'bun:test';
import type { TechNiche } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { TechNicheInUseException } from '../../../../domain/exceptions/skills-catalog.exceptions';
import { InMemoryAdminTechNichesRepository } from '../../../testing/in-memory-admin-tech-niches.repository';
import { CreateAdminTechNicheUseCase } from '../create-admin-tech-niche/create-admin-tech-niche.use-case';
import { DeleteAdminTechNicheUseCase } from '../delete-admin-tech-niche/delete-admin-tech-niche.use-case';
import { GetAdminTechNicheUseCase } from '../get-admin-tech-niche/get-admin-tech-niche.use-case';
import { UpdateAdminTechNicheUseCase } from '../update-admin-tech-niche/update-admin-tech-niche.use-case';
import { ListAdminTechNichesUseCase } from './list-admin-tech-niches.use-case';

describe('Admin tech-niches use cases', () => {
  it('list returns the paginated rows', async () => {
    const repo = new InMemoryAdminTechNichesRepository();
    const result = await new ListAdminTechNichesUseCase(repo).execute({});
    expect(result.items).toEqual([]);
  });

  it('get throws when missing', async () => {
    const repo = new InMemoryAdminTechNichesRepository();
    await expect(new GetAdminTechNicheUseCase(repo).execute('x')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('create forwards input', async () => {
    const repo = new InMemoryAdminTechNichesRepository();
    await new CreateAdminTechNicheUseCase(repo).execute({
      slug: 'web',
      nameEn: 'Web',
      namePtBr: 'Web',
      areaId: 'area-1',
    });
    expect(repo.created).toHaveLength(1);
  });

  it('update throws when missing', async () => {
    const repo = new InMemoryAdminTechNichesRepository();
    await expect(new UpdateAdminTechNicheUseCase(repo).execute('x', {})).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('delete blocks when skills still reference the niche', async () => {
    const repo = new InMemoryAdminTechNichesRepository();
    repo.seed({ id: 'n-1' } as unknown as TechNiche);
    repo.setSkillCount('n-1', 2);
    await expect(new DeleteAdminTechNicheUseCase(repo).execute('n-1')).rejects.toBeInstanceOf(
      TechNicheInUseException,
    );
  });
});
