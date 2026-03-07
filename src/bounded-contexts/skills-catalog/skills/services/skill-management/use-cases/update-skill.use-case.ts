import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Skill, UpdateSkillData } from '../ports/skill-management.port';
import type { SkillManagementRepositoryPort } from '../ports/skill-management-repository.port';

const SKILL_SECTION_TYPE_KEY = 'skill_set_v1';

export class UpdateSkillUseCase {
  constructor(private readonly repository: SkillManagementRepositoryPort) {}

  async execute(skillId: string, data: UpdateSkillData): Promise<Skill> {
    const existingSkill = await this.repository.findSkillById(skillId);

    if (!existingSkill) {
      throw new EntityNotFoundException('Skill');
    }

    if (existingSkill.resumeSection.sectionType.key !== SKILL_SECTION_TYPE_KEY) {
      throw new EntityNotFoundException('Skill');
    }

    const currentContent = this.asRecord(existingSkill.content);

    const newContent: Record<string, unknown> = {
      ...currentContent,
    };

    if (data.name !== undefined) {
      newContent.name = data.name;
    }
    if (data.category !== undefined) {
      newContent.category = data.category;
    }
    if (data.level !== undefined) {
      newContent.level = data.level;
    }

    const updatedItem = await this.repository.updateSkillContent(skillId, newContent);

    return this.toSkill(updatedItem, existingSkill.resumeSection.resumeId);
  }

  private toSkill(item: { id: string; order: number; content: unknown }, resumeId: string): Skill {
    const content = this.asRecord(item.content);

    return {
      id: item.id,
      resumeId,
      name: typeof content.name === 'string' ? content.name : '',
      category: typeof content.category === 'string' ? content.category : '',
      level: typeof content.level === 'number' ? content.level : undefined,
      order: item.order,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }
}
