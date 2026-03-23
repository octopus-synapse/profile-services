import type { SkillManagementPort } from '../ports/skill-management.port';
import type { SkillManagementRepositoryPort } from '../ports/skill-management-repository.port';
import { AddSkillUseCase } from '../use-cases/add-skill.use-case';
import { DeleteSkillUseCase } from '../use-cases/delete-skill.use-case';
import { ListSkillsUseCase } from '../use-cases/list-skills.use-case';
import { UpdateSkillUseCase } from '../use-cases/update-skill.use-case';

export function buildSkillManagementUseCases(
  repository: SkillManagementRepositoryPort & SkillManagementPort,
) {
  return {
    listSkillsUseCase: new ListSkillsUseCase(repository),
    addSkillUseCase: new AddSkillUseCase(repository),
    updateSkillUseCase: new UpdateSkillUseCase(repository),
    deleteSkillUseCase: new DeleteSkillUseCase(repository),
  };
}
