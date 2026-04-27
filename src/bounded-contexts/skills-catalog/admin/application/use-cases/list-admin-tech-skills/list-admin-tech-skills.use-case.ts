import {
  type AdminTechSkillsListQuery,
  AdminTechSkillsRepositoryPort,
} from '../../../domain/ports/admin-tech-skills.repository.port';

export class ListAdminTechSkillsUseCase {
  constructor(private readonly repository: AdminTechSkillsRepositoryPort) {}

  execute(query: AdminTechSkillsListQuery) {
    return this.repository.findAll(query);
  }
}
