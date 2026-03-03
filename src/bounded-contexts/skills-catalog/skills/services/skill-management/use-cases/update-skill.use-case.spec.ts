import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { UpdateSkillUseCase } from './update-skill.use-case';
import type {
  SkillManagementRepositoryPort,
  SectionItem,
} from '../ports/skill-management.port';

const SKILL_SECTION_TYPE_KEY = 'skill_set_v1';

describe('UpdateSkillUseCase', () => {
  let useCase: UpdateSkillUseCase;
  let repository: SkillManagementRepositoryPort;

  const existingSkill: SectionItem = {
    id: 'skill-1',
    order: 0,
    content: { name: 'TypeScript', category: 'Language', level: 4 },
    resumeSection: {
      resumeId: 'resume-1',
      sectionType: { key: SKILL_SECTION_TYPE_KEY },
    },
  };

  beforeEach(() => {
    repository = {
      resumeExists: mock(async () => true),
      findSkillSectionWithItems: mock(async () => null),
      ensureSkillSection: mock(async () => ({ id: 'section-1' })),
      getNextOrderValue: mock(async () => 0),
      createSkillItem: mock(async () => ({
        id: 'skill-1',
        order: 0,
        content: {},
      })),
      findSkillById: mock(async () => existingSkill),
      updateSkillContent: mock(async () => ({
        id: 'skill-1',
        order: 0,
        content: { name: 'TypeScript', category: 'Language', level: 5 },
      })),
      deleteSkill: mock(async () => undefined),
    } as SkillManagementRepositoryPort;

    useCase = new UpdateSkillUseCase(repository);
  });

  it('updates skill and returns domain entity', async () => {
    const result = await useCase.execute('skill-1', { level: 5 });

    expect(repository.findSkillById).toHaveBeenCalledWith('skill-1');
    expect(repository.updateSkillContent).toHaveBeenCalledWith('skill-1', {
      name: 'TypeScript',
      category: 'Language',
      level: 5,
    });
    expect(result).toEqual({
      id: 'skill-1',
      resumeId: 'resume-1',
      name: 'TypeScript',
      category: 'Language',
      level: 5,
      order: 0,
    });
  });

  it('updates only provided fields', async () => {
    repository.updateSkillContent = mock(async () => ({
      id: 'skill-1',
      order: 0,
      content: { name: 'TS', category: 'Language', level: 4 },
    }));

    await useCase.execute('skill-1', { name: 'TS' });

    expect(repository.updateSkillContent).toHaveBeenCalledWith('skill-1', {
      name: 'TS',
      category: 'Language',
      level: 4,
    });
  });

  it('throws EntityNotFoundException when skill does not exist', async () => {
    repository.findSkillById = mock(async () => null);

    await expect(useCase.execute('non-existent', { level: 5 })).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('throws EntityNotFoundException when item is not a skill', async () => {
    repository.findSkillById = mock(async () => ({
      ...existingSkill,
      resumeSection: {
        resumeId: 'resume-1',
        sectionType: { key: 'other_section_type' },
      },
    }));

    await expect(useCase.execute('skill-1', { level: 5 })).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
