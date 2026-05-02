import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { InvalidSkillCategoryException } from '../../../../domain/exceptions/skills-catalog.exceptions';
import type { CreateSkillData, Skill } from '../../../domain/ports/skill-management.port';
import type { SkillManagementRepositoryPort } from '../../../domain/ports/skill-management.repository.port';

/**
 * Whitelist of skill categories accepted on the public add/update API.
 * Anything outside this list rejects with `InvalidSkillCategoryException`
 * — keeps user-facing skill grouping consistent across resumes and
 * prevents free-typed values from polluting downstream analytics.
 */
const VALID_SKILL_CATEGORIES = new Set([
  'Language',
  'Framework',
  'Library',
  'Tool',
  'Platform',
  'Database',
  'Cloud',
  'OS',
  'Methodology',
  'SoftSkill',
  'Other',
]);

export class AddSkillUseCase {
  constructor(private readonly repository: SkillManagementRepositoryPort) {}

  async execute(resumeId: string, data: CreateSkillData): Promise<Skill> {
    if (!VALID_SKILL_CATEGORIES.has(data.category)) {
      throw new InvalidSkillCategoryException(data.category);
    }

    const exists = await this.repository.resumeExists(resumeId);

    if (!exists) {
      throw new EntityNotFoundException('Resume');
    }

    const section = await this.repository.ensureSkillSection(resumeId);
    const order = await this.repository.getNextOrderValue(section.id);

    const content: Record<string, unknown> = { name: data.name, category: data.category };

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
