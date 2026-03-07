import { SkillManagementPort } from '../ports/skill-management.port';

export class ListSkillsUseCase {
  constructor(private readonly skillManagementPort: SkillManagementPort) {}

  execute(): string[] {
    return this.skillManagementPort.listSkills();
  }
}
