import { AdminTechSkillsRepositoryPort } from '../../../domain/ports/admin-tech-skills.repository.port';

export class CreateAdminTechSkillUseCase {
  constructor(private readonly repository: AdminTechSkillsRepositoryPort) {}

  execute(input: Record<string, unknown>) {
    return this.repository.create(input);
  }
}
