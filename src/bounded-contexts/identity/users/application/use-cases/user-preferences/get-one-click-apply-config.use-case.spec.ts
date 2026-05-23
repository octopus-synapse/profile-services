import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryUserPreferencesRepository } from '@/bounded-contexts/identity/shared-kernel/testing/in-memory/in-memory-user-preferences.repository';
import { GetOneClickApplyConfigUseCase } from './get-one-click-apply-config.use-case';

describe('GetOneClickApplyConfigUseCase', () => {
  let repository: InMemoryUserPreferencesRepository;
  let useCase: GetOneClickApplyConfigUseCase;

  beforeEach(() => {
    repository = new InMemoryUserPreferencesRepository();
    useCase = new GetOneClickApplyConfigUseCase(repository);
  });

  it('returns null when the user has never saved a config', async () => {
    const result = await useCase.execute('user-1');
    expect(result).toBeNull();
  });

  it('returns the stored config when present', async () => {
    await repository.upsertOneClickApplyConfig('user-1', {
      enabled: true,
      resumeId: '01900000-0000-7000-a000-000000000010',
      coverLetterTemplate: 'Hi {{job.company}}',
      tailoringMode: 'AI_TAILOR',
      alsoAttach: { githubUrl: true, linkedinUrl: false },
    });

    const result = await useCase.execute('user-1');

    expect(result).not.toBeNull();
    expect(result?.enabled).toBe(true);
    expect(result?.tailoringMode).toBe('AI_TAILOR');
    expect(result?.alsoAttach.githubUrl).toBe(true);
  });
});
