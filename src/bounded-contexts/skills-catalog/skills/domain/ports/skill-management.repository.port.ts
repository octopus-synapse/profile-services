import type { SectionItem, SkillItemRecord, SkillSection } from './skill-management.port';

export abstract class SkillManagementRepositoryPort {
  // Creation port
  abstract resumeExists(resumeId: string): Promise<boolean>;
  abstract ensureSkillSection(resumeId: string): Promise<{ id: string }>;
  abstract getNextOrderValue(sectionId: string): Promise<number>;
  abstract createSkillItem(
    sectionId: string,
    content: Record<string, unknown>,
    order: number,
  ): Promise<SkillItemRecord>;

  // Item port
  abstract findSkillSectionWithItems(resumeId: string): Promise<SkillSection | null>;
  abstract findSkillById(skillId: string): Promise<SectionItem | null>;
  abstract updateSkillContent(
    skillId: string,
    content: Record<string, unknown>,
  ): Promise<SkillItemRecord>;
  abstract deleteSkill(skillId: string): Promise<void>;
}
