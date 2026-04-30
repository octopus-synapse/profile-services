import { describe, expect, it } from 'bun:test';
import type { SpokenLanguage } from '@prisma/client';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryAdminSpokenLanguagesRepository } from '../../../testing/in-memory-admin-spoken-languages.repository';
import { CreateAdminSpokenLanguageUseCase } from '../create-admin-spoken-language/create-admin-spoken-language.use-case';
import { DeleteAdminSpokenLanguageUseCase } from '../delete-admin-spoken-language/delete-admin-spoken-language.use-case';
import { GetAdminSpokenLanguageUseCase } from '../get-admin-spoken-language/get-admin-spoken-language.use-case';
import { UpdateAdminSpokenLanguageUseCase } from '../update-admin-spoken-language/update-admin-spoken-language.use-case';
import { ListAdminSpokenLanguagesUseCase } from './list-admin-spoken-languages.use-case';

describe('Admin spoken-languages use cases', () => {
  it('list returns rows', async () => {
    const repo = new InMemoryAdminSpokenLanguagesRepository();
    const result = await new ListAdminSpokenLanguagesUseCase(repo).execute({});
    expect(result.items).toEqual([]);
  });

  it('get throws when missing', async () => {
    const repo = new InMemoryAdminSpokenLanguagesRepository();
    await expect(new GetAdminSpokenLanguageUseCase(repo).execute('xx')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('create + update + delete by code', async () => {
    const repo = new InMemoryAdminSpokenLanguagesRepository();
    repo.seed({ code: 'pt-BR' } as unknown as SpokenLanguage);
    await new CreateAdminSpokenLanguageUseCase(repo).execute({ code: 'en' });
    await new UpdateAdminSpokenLanguageUseCase(repo).execute('pt-BR', { isActive: false });
    await new DeleteAdminSpokenLanguageUseCase(repo).execute('pt-BR');
    expect(repo.created).toHaveLength(1);
    expect(repo.updated).toHaveLength(1);
    expect(repo.deleted).toEqual(['pt-BR']);
  });
});
