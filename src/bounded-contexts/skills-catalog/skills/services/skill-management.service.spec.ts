import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { SkillManagementService } from './skill-management/skill-management.service';
import { ListSkillsUseCase } from './skill-management/use-cases/list-skills.use-case';

describe('SkillManagementService', () => {
  let service: SkillManagementService;
  let listSkillsUseCase: ListSkillsUseCase;

  beforeEach(() => {
    listSkillsUseCase = {
      execute: mock(() => ['TypeScript', 'React']),
    } as unknown as ListSkillsUseCase;

    service = new SkillManagementService(listSkillsUseCase);
  });

  it('delegates listSkills to ListSkillsUseCase', () => {
    const result = service.listSkills();

    expect(listSkillsUseCase.execute).toHaveBeenCalled();
    expect(result).toEqual(['TypeScript', 'React']);
  });
});
