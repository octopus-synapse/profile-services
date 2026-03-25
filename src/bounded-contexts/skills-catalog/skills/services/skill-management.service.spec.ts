import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SkillManagementRepositoryPort } from './skill-management/ports/skill-management-repository.port';
import { SkillManagementService } from './skill-management/skill-management.service';
import { ListSkillsUseCase } from './skill-management/use-cases/list-skills.use-case';

describe('SkillManagementService', () => {
  let service: SkillManagementService;
  let listSkillsUseCase: ListSkillsUseCase;
  let mockRepository: SkillManagementRepositoryPort;

  beforeEach(() => {
    listSkillsUseCase = {
      execute: mock(() => ['TypeScript', 'React']),
    } as unknown as ListSkillsUseCase;

    mockRepository = {
      resumeExists: mock(() => Promise.resolve(true)),
      ensureSkillSection: mock(() => Promise.resolve({ id: 'section-1' })),
      getNextOrderValue: mock(() => Promise.resolve(0)),
      createSkillItem: mock(() =>
        Promise.resolve({ id: 'item-1', order: 0, content: { name: 'TS', category: 'lang' } }),
      ),
      findSkillSectionWithItems: mock(() => Promise.resolve(null)),
      findSkillById: mock(() => Promise.resolve(null)),
      updateSkillContent: mock(() =>
        Promise.resolve({ id: 'item-1', order: 0, content: { name: 'TS', category: 'lang' } }),
      ),
      deleteSkill: mock(() => Promise.resolve()),
    } as unknown as SkillManagementRepositoryPort;

    service = new SkillManagementService(listSkillsUseCase, mockRepository);
  });

  it('delegates listSkills to ListSkillsUseCase', () => {
    const result = service.listSkills();

    expect(listSkillsUseCase.execute).toHaveBeenCalled();
    expect(result).toEqual(['TypeScript', 'React']);
  });

  it('delegates addSkillToResume to AddSkillUseCase', async () => {
    const skill = await service.addSkillToResume('resume-1', {
      name: 'TypeScript',
      category: 'language',
    });

    expect(mockRepository.resumeExists).toHaveBeenCalledWith('resume-1');
    expect(skill).toBeDefined();
    expect(skill.id).toBe('item-1');
  });

  it('returns empty array when no skills section exists', async () => {
    const skills = await service.listSkillsForResume('resume-1');

    expect(skills).toEqual([]);
  });
});
