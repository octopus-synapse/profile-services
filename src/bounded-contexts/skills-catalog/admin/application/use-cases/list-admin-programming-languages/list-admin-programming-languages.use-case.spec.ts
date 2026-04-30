import { describe, expect, it } from 'bun:test';
import type { ProgrammingLanguage } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryAdminProgrammingLanguagesRepository } from '../../../testing/in-memory-admin-programming-languages.repository';
import { CreateAdminProgrammingLanguageUseCase } from '../create-admin-programming-language/create-admin-programming-language.use-case';
import { DeleteAdminProgrammingLanguageUseCase } from '../delete-admin-programming-language/delete-admin-programming-language.use-case';
import { GetAdminProgrammingLanguageUseCase } from '../get-admin-programming-language/get-admin-programming-language.use-case';
import { UpdateAdminProgrammingLanguageUseCase } from '../update-admin-programming-language/update-admin-programming-language.use-case';
import { ListAdminProgrammingLanguagesUseCase } from './list-admin-programming-languages.use-case';

describe('Admin programming-languages use cases', () => {
  it('list returns rows', async () => {
    const repo = new InMemoryAdminProgrammingLanguagesRepository();
    const result = await new ListAdminProgrammingLanguagesUseCase(repo).execute({});
    expect(result.items).toEqual([]);
  });

  it('get throws when missing', async () => {
    const repo = new InMemoryAdminProgrammingLanguagesRepository();
    await expect(
      new GetAdminProgrammingLanguageUseCase(repo).execute('zzz'),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('create + update + delete by slug', async () => {
    const repo = new InMemoryAdminProgrammingLanguagesRepository();
    repo.seed({ slug: 'rust' } as unknown as ProgrammingLanguage);
    await new CreateAdminProgrammingLanguageUseCase(repo).execute({ slug: 'go' });
    await new UpdateAdminProgrammingLanguageUseCase(repo).execute('rust', { isActive: false });
    await new DeleteAdminProgrammingLanguageUseCase(repo).execute('rust');
    expect(repo.created).toHaveLength(1);
    expect(repo.updated).toHaveLength(1);
    expect(repo.deleted).toEqual(['rust']);
  });
});
