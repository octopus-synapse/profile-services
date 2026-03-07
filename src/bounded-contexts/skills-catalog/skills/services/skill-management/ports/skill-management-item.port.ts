import type { SectionItem, SkillItemRecord, SkillSection } from './skill-management.port';

export interface ISkillManagementItemPort {
  findSkillSectionWithItems(resumeId: string): Promise<SkillSection | null>;
  findSkillById(skillId: string): Promise<SectionItem | null>;
  updateSkillContent(skillId: string, content: Record<string, unknown>): Promise<SkillItemRecord>;
  deleteSkill(skillId: string): Promise<void>;
}

export type SkillManagementItemPort = ISkillManagementItemPort;
