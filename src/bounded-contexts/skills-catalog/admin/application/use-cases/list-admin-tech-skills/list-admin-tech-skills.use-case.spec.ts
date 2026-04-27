import { describe, expect, it } from 'bun:test';
import type { TechSkill } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryAdminTechSkillsRepository } from '../../../testing/in-memory-admin-tech-skills.repository';
import { CreateAdminTechSkillUseCase } from '../create-admin-tech-skill/create-admin-tech-skill.use-case';
import { DeleteAdminTechSkillUseCase } from '../delete-admin-tech-skill/delete-admin-tech-skill.use-case';
import { GetAdminTechSkillUseCase } from '../get-admin-tech-skill/get-admin-tech-skill.use-case';
import { UpdateAdminTechSkillUseCase } from '../update-admin-tech-skill/update-admin-tech-skill.use-case';
import { ListAdminTechSkillsUseCase } from './list-admin-tech-skills.use-case';

describe('Admin tech-skills use cases', () => {
  it('list returns rows', async () => {
    const repo = new InMemoryAdminTechSkillsRepository();
    const result = await new ListAdminTechSkillsUseCase(repo).execute({});
    expect(result.items).toEqual([]);
  });

  it('get throws when missing', async () => {
    const repo = new InMemoryAdminTechSkillsRepository();
    await expect(new GetAdminTechSkillUseCase(repo).execute('x')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('create forwards input', async () => {
    const repo = new InMemoryAdminTechSkillsRepository();
    await new CreateAdminTechSkillUseCase(repo).execute({ slug: 'react' });
    expect(repo.created).toHaveLength(1);
  });

  it('update throws when missing', async () => {
    const repo = new InMemoryAdminTechSkillsRepository();
    await expect(new UpdateAdminTechSkillUseCase(repo).execute('x', {})).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('delete removes the row', async () => {
    const repo = new InMemoryAdminTechSkillsRepository();
    repo.seed({ id: 's-1' } as unknown as TechSkill);
    await new DeleteAdminTechSkillUseCase(repo).execute('s-1');
    expect(repo.deleted).toEqual(['s-1']);
  });
});
