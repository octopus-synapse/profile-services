import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type {
  CreateSkillData,
  Skill,
  SkillManagementRepositoryPort,
} from '../ports/skill-management.port';

export class AddSkillUseCase {
  constructor(private readonly repository: SkillManagementRepositoryPort) {}

  async execute(resumeId: string, data: CreateSkillData): Promise<Skill> {
    const exists = await this.repository.resumeExists(resumeId);

    if (!exists) {
      throw new EntityNotFoundException('Resume');
    }

    const section = await this.repository.ensureSkillSection(resumeId);
    const order = await this.repository.getNextOrderValue(section.id);

    const content: Record<string, unknown> = {
      name: data.name,
      category: data.category,
    };

    if (data.level !== undefined) {
      content.level = data.level;
    }

    const item = await this.repository.createSkillItem(section.id, content, order);

    return this.toSkill(item, resumeId);
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
