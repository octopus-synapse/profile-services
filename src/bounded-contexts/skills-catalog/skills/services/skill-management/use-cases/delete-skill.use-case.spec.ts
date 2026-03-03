import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { DeleteSkillUseCase } from './delete-skill.use-case';
import type {
  SkillManagementRepositoryPort,
  SectionItem,
} from '../ports/skill-management.port';

const SKILL_SECTION_TYPE_KEY = 'skill_set_v1';

describe('DeleteSkillUseCase', () => {
  let useCase: DeleteSkillUseCase;
  let repository: SkillManagementRepositoryPort;

  const existingSkill: SectionItem = {
    id: 'skill-1',
    order: 0,
    content: { name: 'TypeScript', category: 'Language' },
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
        content: {},
      })),
      deleteSkill: mock(async () => undefined),
    } as SkillManagementRepositoryPort;

    useCase = new DeleteSkillUseCase(repository);
  });

  it('deletes skill and returns void', async () => {
    const result = await useCase.execute('skill-1');

    expect(repository.findSkillById).toHaveBeenCalledWith('skill-1');
    expect(repository.deleteSkill).toHaveBeenCalledWith('skill-1');
    expect(result).toBeUndefined();
  });

  it('throws EntityNotFoundException when skill does not exist', async () => {
    repository.findSkillById = mock(async () => null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
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

    await expect(useCase.execute('skill-1')).rejects.toThrow(EntityNotFoundException);
  });
});
