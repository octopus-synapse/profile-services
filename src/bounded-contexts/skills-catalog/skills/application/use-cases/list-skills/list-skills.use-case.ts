import { SkillManagementPort } from '../../../domain/ports/skill-management.port';

export class ListSkillsUseCase {
  constructor(private readonly skillManagementPort: SkillManagementPort) {}

  execute(): string[] {
    return this.skillManagementPort.listSkills();
  }
}
