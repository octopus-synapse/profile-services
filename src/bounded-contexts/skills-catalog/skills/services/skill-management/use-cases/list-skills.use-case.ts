import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { Skill, SkillManagementRepositoryPort } from '../ports/skill-management.port';

export class ListSkillsUseCase {
  constructor(private readonly repository: SkillManagementRepositoryPort) {}

  async execute(resumeId: string): Promise<Skill[]> {
    const exists = await this.repository.resumeExists(resumeId);

    if (!exists) {
      throw new EntityNotFoundException('Resume');
    }

    const section = await this.repository.findSkillSectionWithItems(resumeId);

    if (!section) {
      return [];
    }

    return section.items.map((item) => this.toSkill(item, resumeId));
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
