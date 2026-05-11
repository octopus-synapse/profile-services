import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryUserPreferencesRepository } from '@/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-user-preferences.repository';
import type { OneClickApplyConfig } from '../../ports/user-preferences.port';
import { UpdateOneClickApplyConfigUseCase } from './update-one-click-apply-config.use-case';

const BASE_CONFIG: OneClickApplyConfig = {
  enabled: true,
  resumeId: '01900000-0000-7000-a000-000000000010',
  coverLetterTemplate: 'Hi {{job.company}}',
  tailoringMode: 'AI_TAILOR',
  alsoAttach: { githubUrl: true, linkedinUrl: true },
};

describe('UpdateOneClickApplyConfigUseCase', () => {
  let repository: InMemoryUserPreferencesRepository;
  let useCase: UpdateOneClickApplyConfigUseCase;

  beforeEach(() => {
    repository = new InMemoryUserPreferencesRepository();
    useCase = new UpdateOneClickApplyConfigUseCase(repository);
  });

  it('persists the config and returns it', async () => {
    const saved = await useCase.execute('user-1', BASE_CONFIG);

    expect(saved).toEqual(BASE_CONFIG);
    expect(await repository.findOneClickApplyConfig('user-1')).toEqual(BASE_CONFIG);
  });

  it('overwrites the prior config on subsequent calls', async () => {
    await useCase.execute('user-1', BASE_CONFIG);

    const next: OneClickApplyConfig = {
      ...BASE_CONFIG,
      enabled: false,
      tailoringMode: 'VERBATIM',
      alsoAttach: { githubUrl: false, linkedinUrl: false },
    };
    await useCase.execute('user-1', next);

    expect(await repository.findOneClickApplyConfig('user-1')).toEqual(next);
  });
});
