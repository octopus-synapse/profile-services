/**
 * In-memory test double for `SkillManagementRepositoryPort`. Holds
 * a flat list of skill items keyed by their `(resumeId, id)` and
 * fakes the section concept with a single bucket per resume.
 */

import type {
  SectionItem,
  SkillItemRecord,
  SkillSection,
} from '../domain/ports/skill-management.port';
import { SkillManagementPort } from '../domain/ports/skill-management.port';
import type { SkillManagementRepositoryPort } from '../domain/ports/skill-management.repository.port';

const SKILL_SECTION_TYPE_KEY = 'skill_set_v1';

interface ItemRow {
  readonly id: string;
  readonly resumeId: string;
  readonly sectionId: string;
  order: number;
  content: Record<string, unknown>;
}

let counter = 0;

export class InMemorySkillManagementRepository
  extends SkillManagementPort
  implements SkillManagementRepositoryPort
{
  readonly resumes = new Set<string>();
  readonly sections = new Map<string, string>(); // resumeId → sectionId
  readonly items = new Map<string, ItemRow>();

  seedResume(resumeId: string): void {
    this.resumes.add(resumeId);
  }

  listSkills(): string[] {
    return [];
  }

  async resumeExists(resumeId: string): Promise<boolean> {
    return this.resumes.has(resumeId);
  }

  async ensureSkillSection(resumeId: string): Promise<{ id: string }> {
    let id = this.sections.get(resumeId);
    if (!id) {
      id = `sec-${++counter}`;
      this.sections.set(resumeId, id);
    }
    return { id };
  }

  async getNextOrderValue(sectionId: string): Promise<number> {
    let max = -1;
    for (const item of this.items.values()) {
      if (item.sectionId === sectionId && item.order > max) max = item.order;
    }
    return max + 1;
  }

  async createSkillItem(
    sectionId: string,
    content: Record<string, unknown>,
    order: number,
  ): Promise<SkillItemRecord> {
    const id = `item-${++counter}`;
    const resumeId = [...this.sections.entries()].find(([, sec]) => sec === sectionId)?.[0] ?? '';
    const row: ItemRow = { id, resumeId, sectionId, order, content };
    this.items.set(id, row);
    return { id, order, content };
  }

  async findSkillSectionWithItems(resumeId: string): Promise<SkillSection | null> {
    const sectionId = this.sections.get(resumeId);
    if (!sectionId) return null;
    const items = [...this.items.values()]
      .filter((i) => i.sectionId === sectionId)
      .sort((a, b) => a.order - b.order)
      .map((i) => ({
        id: i.id,
        order: i.order,
        content: i.content,
        resumeSection: { resumeId: i.resumeId, sectionType: { key: SKILL_SECTION_TYPE_KEY } },
      }));
    return { id: sectionId, items };
  }

  async findSkillById(skillId: string): Promise<SectionItem | null> {
    const row = this.items.get(skillId);
    if (!row) return null;
    return {
      id: row.id,
      order: row.order,
      content: row.content,
      resumeSection: { resumeId: row.resumeId, sectionType: { key: SKILL_SECTION_TYPE_KEY } },
    };
  }

  async updateSkillContent(
    skillId: string,
    content: Record<string, unknown>,
  ): Promise<SkillItemRecord> {
    const row = this.items.get(skillId);
    if (!row) throw new Error(`Skill ${skillId} not found`);
    row.content = content;
    return { id: row.id, order: row.order, content };
  }

  async deleteSkill(skillId: string): Promise<void> {
    this.items.delete(skillId);
  }
}
