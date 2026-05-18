import { EntityNotFoundException, ValidationException } from '@/shared-kernel/exceptions';
import { InvalidSkillCategoryException } from '../../../../domain/exceptions/skills-catalog.exceptions';
import type { CreateSkillData, Skill } from '../../../domain/ports/skill-management.port';
import type { SkillManagementRepositoryPort } from '../../../domain/ports/skill-management.repository.port';

class DuplicateSkillException extends ValidationException {
  override readonly code: string = 'DUPLICATE_SKILL_NAME';
  constructor(name: string) {
    super(`Skill "${name}" already exists on this resume`);
  }
}

function normalizeSkillName(name: string): string {
  // P1-#A2-26: trim whitespace + collapse internal runs. We keep the
  // user-supplied casing for the UI label but compare case-insensitively
  // for dedup so "Java"/"java"/"JAVA" cluster.
  return name.replace(/\s+/g, ' ').trim();
}

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

    // P1-#A2-26: normalize name (trim + collapse whitespace) before any
    // persistence / dedup check. Without this, "  Java" and "Java " end
    // up as separate skills.
    const name = normalizeSkillName(data.name);
    if (name.length === 0) {
      throw new ValidationException('Skill name cannot be empty');
    }

    const exists = await this.repository.resumeExists(resumeId);

    if (!exists) {
      throw new EntityNotFoundException('Resume');
    }

    // P1-#A2-26: case-insensitive dedup against the resume's existing
    // skills. Ownership of `resumeId` is enforced at the route layer
    // via OwnershipGuard; this UC is therefore only reached for owned
    // resumes, but the dedup still matters because the same owner
    // could spam "Java"/"java"/"JAVA" otherwise.
    const existingSection = await this.repository.findSkillSectionWithItems(resumeId);
    if (existingSection?.items) {
      const lowered = name.toLowerCase();
      for (const item of existingSection.items) {
        const content = this.asRecord(item.content);
        const otherName = typeof content.name === 'string' ? content.name : '';
        if (otherName.trim().toLowerCase() === lowered) {
          throw new DuplicateSkillException(name);
        }
      }
    }

    const section = await this.repository.ensureSkillSection(resumeId);
    const order = await this.repository.getNextOrderValue(section.id);

    const content: Record<string, unknown> = { name, category: data.category };

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
