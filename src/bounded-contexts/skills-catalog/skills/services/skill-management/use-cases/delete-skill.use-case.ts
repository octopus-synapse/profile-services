import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { SkillManagementRepositoryPort } from '../ports/skill-management-repository.port';

const SKILL_SECTION_TYPE_KEY = 'skill_set_v1';

export class DeleteSkillUseCase {
  constructor(private readonly repository: SkillManagementRepositoryPort) {}

  async execute(skillId: string): Promise<void> {
    const existingSkill = await this.repository.findSkillById(skillId);

    if (!existingSkill) {
      throw new EntityNotFoundException('Skill');
    }

    if (existingSkill.resumeSection.sectionType.key !== SKILL_SECTION_TYPE_KEY) {
      throw new EntityNotFoundException('Skill');
    }

    await this.repository.deleteSkill(skillId);
  }
}
