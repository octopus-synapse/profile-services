import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { ListSkillsUseCase } from './list-skills.use-case';
import type { SkillManagementRepositoryPort } from '../ports/skill-management.port';

describe('ListSkillsUseCase', () => {
  let useCase: ListSkillsUseCase;
  let repository: SkillManagementRepositoryPort;

  beforeEach(() => {
    repository = {
      resumeExists: mock(async () => true),
      findSkillSectionWithItems: mock(async () => ({
        items: [
          {
            id: 'skill-1',
            order: 0,
            content: { name: 'TypeScript', category: 'Language', level: 5 },
          },
          {
            id: 'skill-2',
            order: 1,
            content: { name: 'Node.js', category: 'Runtime' },
          },
        ],
      })),
      ensureSkillSection: mock(async () => ({ id: 'section-1' })),
      getNextOrderValue: mock(async () => 0),
      createSkillItem: mock(async () => ({
        id: 'skill-1',
        order: 0,
        content: {},
      })),
      findSkillById: mock(async () => null),
      updateSkillContent: mock(async () => ({
        id: 'skill-1',
        order: 0,
        content: {},
      })),
      deleteSkill: mock(async () => undefined),
    } as SkillManagementRepositoryPort;

    useCase = new ListSkillsUseCase(repository);
  });

  it('returns skills array for valid resume', async () => {
    const result = await useCase.execute('resume-1');

    expect(repository.resumeExists).toHaveBeenCalledWith('resume-1');
    expect(repository.findSkillSectionWithItems).toHaveBeenCalledWith(
      'resume-1',
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'skill-1',
      resumeId: 'resume-1',
      name: 'TypeScript',
      category: 'Language',
      level: 5,
      order: 0,
    });
    expect(result[1]).toEqual({
      id: 'skill-2',
      resumeId: 'resume-1',
      name: 'Node.js',
      category: 'Runtime',
      level: undefined,
      order: 1,
    });
  });

  it('returns empty array when no skill section exists', async () => {
    repository.findSkillSectionWithItems = mock(async () => null);

    const result = await useCase.execute('resume-1');

    expect(result).toEqual([]);
  });

  it('throws EntityNotFoundException when resume does not exist', async () => {
    repository.resumeExists = mock(async () => false);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
