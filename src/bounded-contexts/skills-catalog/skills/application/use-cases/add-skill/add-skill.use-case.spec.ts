import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { SkillManagementRepositoryPort } from '../../../domain/ports/skill-management.repository.port';
import { AddSkillUseCase } from './add-skill.use-case';

describe('AddSkillUseCase', () => {
  let useCase: AddSkillUseCase;
  let repository: SkillManagementRepositoryPort;

  beforeEach(() => {
    repository = {
      resumeExists: mock(async () => true),
      findSkillSectionWithItems: mock(async () => null),
      ensureSkillSection: mock(async () => ({ id: 'section-1' })),
      getNextOrderValue: mock(async () => 0),
      createSkillItem: mock(async () => ({
        id: 'skill-1',
        order: 0,
        content: { name: 'TypeScript', category: 'Language', level: 5 },
      })),
      findSkillById: mock(async () => null),
      updateSkillContent: mock(async () => ({
        id: 'skill-1',
        order: 0,
        content: {},
      })),
      deleteSkill: mock(async () => undefined),
    } as SkillManagementRepositoryPort;

    useCase = new AddSkillUseCase(repository);
  });

  it('creates skill and returns domain entity', async () => {
    const input = { name: 'TypeScript', category: 'Language', level: 5 };

    const result = await useCase.execute('resume-1', input);

    expect(repository.resumeExists).toHaveBeenCalledWith('resume-1');
    expect(repository.ensureSkillSection).toHaveBeenCalledWith('resume-1');
    expect(repository.getNextOrderValue).toHaveBeenCalledWith('section-1');
    expect(repository.createSkillItem).toHaveBeenCalledWith(
      'section-1',
      { name: 'TypeScript', category: 'Language', level: 5 },
      0,
    );
    expect(result).toEqual({
      id: 'skill-1',
      resumeId: 'resume-1',
      name: 'TypeScript',
      category: 'Language',
      level: 5,
      order: 0,
    });
  });

  it('creates skill without optional level', async () => {
    repository.createSkillItem = mock(async () => ({
      id: 'skill-1',
      order: 0,
      content: { name: 'Git', category: 'Tool' },
    }));

    const input = { name: 'Git', category: 'Tool' };

    const result = await useCase.execute('resume-1', input);

    expect(repository.createSkillItem).toHaveBeenCalledWith(
      'section-1',
      { name: 'Git', category: 'Tool' },
      0,
    );
    expect(result.level).toBeUndefined();
  });

  it('throws EntityNotFoundException when resume does not exist', async () => {
    repository.resumeExists = mock(async () => false);

    await expect(
      useCase.execute('non-existent', { name: 'TS', category: 'Language' }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('throws InvalidSkillCategoryException for unknown categories', async () => {
    await expect(useCase.execute('resume-1', { name: 'TS', category: 'Lang' })).rejects.toThrow(
      'Lang',
    );
  });

  it('uses correct order for new skill', async () => {
    repository.getNextOrderValue = mock(async () => 5);
    repository.createSkillItem = mock(async () => ({
      id: 'skill-6',
      order: 5,
      content: { name: 'React', category: 'Framework' },
    }));

    const result = await useCase.execute('resume-1', { name: 'React', category: 'Framework' });

    expect(result.order).toBe(5);
  });

  // P1-#A2-26: normalization + dedup
  it('trims surrounding whitespace before persisting', async () => {
    repository.createSkillItem = mock(async () => ({
      id: 'skill-1',
      order: 0,
      content: { name: 'TypeScript', category: 'Language' },
    }));

    await useCase.execute('resume-1', { name: '  TypeScript  ', category: 'Language' });

    expect(repository.createSkillItem).toHaveBeenCalledWith(
      'section-1',
      expect.objectContaining({ name: 'TypeScript' }),
      0,
    );
  });

  it('rejects empty / whitespace-only names with ValidationException', async () => {
    await expect(
      useCase.execute('resume-1', { name: '   ', category: 'Language' }),
    ).rejects.toThrow('cannot be empty');
  });

  it('rejects duplicate skill (case-insensitive) on the same resume', async () => {
    repository.findSkillSectionWithItems = mock(async () => ({
      id: 'section-1',
      items: [
        {
          id: 'existing-1',
          order: 0,
          content: { name: 'Java', category: 'Language' },
          resumeSection: { resumeId: 'resume-1', sectionType: { key: 'skills' } },
        },
      ],
    }));

    await expect(
      useCase.execute('resume-1', { name: 'java', category: 'Language' }),
    ).rejects.toThrow('already exists');
  });
});
