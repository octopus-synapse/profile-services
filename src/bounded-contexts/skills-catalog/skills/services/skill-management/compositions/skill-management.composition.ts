import { SkillManagementRepository } from '../repository/skill-management.repository';
import { ListSkillsUseCase } from '../use-cases/list-skills.use-case';

export function buildSkillManagementUseCases(repository: SkillManagementRepository) {
  return {
    listSkillsUseCase: new ListSkillsUseCase(repository),
  };
}
