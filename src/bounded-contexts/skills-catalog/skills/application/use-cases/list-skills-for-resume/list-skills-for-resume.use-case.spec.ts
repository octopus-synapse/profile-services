import { beforeEach, describe, expect, it } from 'bun:test';
import type { SkillManagementRepositoryPort } from '../../../domain/ports/skill-management.repository.port';
import { ListSkillsForResumeUseCase } from './list-skills-for-resume.use-case';

describe('ListSkillsForResumeUseCase', () => {
  let useCase: ListSkillsForResumeUseCase;
  let mockRepository: SkillManagementRepositoryPort;

  beforeEach(() => {
    mockRepository = {
      findSkillSectionWithItems: async () => null,
      findSkillById: async () => null,
      updateSkillContent: async () => ({ id: 'item-1', order: 0, content: {} }),
      deleteSkill: async () => {},
      resumeExists: async () => true,
      ensureSkillSection: async () => ({ id: 'sec-1' }),
      getNextOrderValue: async () => 0,
      createSkillItem: async () => ({ id: 'item-1', order: 0, content: {} }),
    };
    useCase = new ListSkillsForResumeUseCase(mockRepository);
  });

  it('should return empty array when no section exists', async () => {
    const result = await useCase.execute('resume-1');
    expect(result).toEqual([]);
  });

  it('should return empty array when section has no items', async () => {
    mockRepository.findSkillSectionWithItems = async () => ({ id: 'section-1', items: [] });

    const result = await useCase.execute('resume-1');
    expect(result).toEqual([]);
  });

  it('should map section items to skills', async () => {
    mockRepository.findSkillSectionWithItems = async () => ({
      id: 'section-1',
      items: [
        {
          id: 'item-1',
          order: 0,
          content: { name: 'TypeScript', category: 'Language', level: 5 },
          resumeSection: { resumeId: 'resume-1', sectionType: { key: 'skill' } },
        },
        {
          id: 'item-2',
          order: 1,
          content: { name: 'React', category: 'Framework' },
          resumeSection: { resumeId: 'resume-1', sectionType: { key: 'skill' } },
        },
      ],
    });

    const result = await useCase.execute('resume-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'item-1',
      resumeId: 'resume-1',
      name: 'TypeScript',
      category: 'Language',
      level: 5,
      order: 0,
    });
    expect(result[1]).toEqual({
      id: 'item-2',
      resumeId: 'resume-1',
      name: 'React',
      category: 'Framework',
      level: undefined,
      order: 1,
    });
  });

  it('should handle invalid content gracefully', async () => {
    mockRepository.findSkillSectionWithItems = async () => ({
      id: 'section-1',
      items: [
        {
          id: 'item-1',
          order: 0,
          content: null,
          resumeSection: { resumeId: 'resume-1', sectionType: { key: 'skill' } },
        },
      ],
    });

    const result = await useCase.execute('resume-1');

    expect(result[0]).toEqual({
      id: 'item-1',
      resumeId: 'resume-1',
      name: '',
      category: '',
      level: undefined,
      order: 0,
    });
  });
});
