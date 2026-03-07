import { describe, expect, it } from 'bun:test';
import { SkillManagementPort } from '../ports/skill-management.port';
import { ListSkillsUseCase } from './list-skills.use-case';

class StubSkillManagementPort extends SkillManagementPort {
  listSkills(): string[] {
    return ['typescript'];
  }
}

describe('ListSkillsUseCase', () => {
  it('returns skills from the configured port', () => {
    const useCase = new ListSkillsUseCase(new StubSkillManagementPort());

    expect(useCase.execute()).toEqual(['typescript']);
  });
});
