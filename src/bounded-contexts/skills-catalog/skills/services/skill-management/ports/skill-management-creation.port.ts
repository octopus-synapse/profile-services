import type { SkillItemRecord } from './skill-management.port';

export interface ISkillManagementCreationPort {
  resumeExists(resumeId: string): Promise<boolean>;
  ensureSkillSection(resumeId: string): Promise<{ id: string }>;
  getNextOrderValue(sectionId: string): Promise<number>;
  createSkillItem(
    sectionId: string,
    content: Record<string, unknown>,
    order: number,
  ): Promise<SkillItemRecord>;
}

export type SkillManagementCreationPort = ISkillManagementCreationPort;
