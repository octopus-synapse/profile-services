import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { SkillManagementPort } from './skill-management/ports/skill-management.port';
import type { SkillManagementRepositoryPort } from './skill-management/ports/skill-management-repository.port';
import { SkillManagementService } from './skill-management/skill-management.service';
import { ListSkillsUseCase } from './skill-management/use-cases/list-skills.use-case';

class StubSkillManagementPort extends SkillManagementPort {
  listSkills = mock((): string[] => ['TypeScript', 'React']);
}

describe('SkillManagementService', () => {
  let service: SkillManagementService;
  let skillManagementPort: StubSkillManagementPort;
  let listSkillsUseCase: ListSkillsUseCase;
  let mockRepository: SkillManagementRepositoryPort;

  beforeEach(() => {
    skillManagementPort = new StubSkillManagementPort();
    listSkillsUseCase = new ListSkillsUseCase(skillManagementPort);

    mockRepository = {
      resumeExists: mock(async () => true),
      ensureSkillSection: mock(async () => ({ id: 'section-1' })),
      getNextOrderValue: mock(async () => 0),
      createSkillItem: mock(async () => ({
        id: 'item-1',
        order: 0,
        content: { name: 'TS', category: 'lang' },
      })),
      findSkillSectionWithItems: mock(async () => null),
      findSkillById: mock(async () => null),
      updateSkillContent: mock(async () => ({
        id: 'item-1',
        order: 0,
        content: { name: 'TS', category: 'lang' },
      })),
      deleteSkill: mock(async () => {}),
    };

    service = new SkillManagementService(listSkillsUseCase, mockRepository);
  });

  it('delegates listSkills to ListSkillsUseCase', () => {
    const result = service.listSkills();

    expect(skillManagementPort.listSkills).toHaveBeenCalled();
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
