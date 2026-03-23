import type { Skill, SkillSection } from '../ports/skill-management.port';
import type { ISkillManagementItemPort } from '../ports/skill-management-item.port';

export class ListSkillsForResumeUseCase {
  constructor(private readonly repository: ISkillManagementItemPort) {}

  async execute(resumeId: string): Promise<Skill[]> {
    const section: SkillSection | null = await this.repository.findSkillSectionWithItems(resumeId);

    if (!section?.items) {
      return [];
    }

    return section.items.map((item) => {
      const content = this.asRecord(item.content);
      return {
        id: item.id,
        resumeId,
        name: typeof content.name === 'string' ? content.name : '',
        category: typeof content.category === 'string' ? content.category : '',
        level: typeof content.level === 'number' ? content.level : undefined,
        order: item.order,
      };
    });
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }
}
