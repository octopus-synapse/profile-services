export abstract class SkillManagementPort {
  abstract listSkills(): string[];
}

export interface Skill {
  id: string;
  resumeId: string;
  name: string;
  category: string;
  level?: number;
  order: number;
}

export interface CreateSkillData {
  name: string;
  category: string;
  level?: number;
}

export interface UpdateSkillData {
  name?: string;
  category?: string;
  level?: number;
}

export interface SectionItem {
  id: string;
  order: number;
  content: unknown;
  resumeSection: {
    resumeId: string;
    sectionType: {
      key: string;
    };
  };
}

export interface SkillSection {
  id: string;
  items?: SectionItem[];
}

export interface SkillItemRecord {
  id: string;
  order: number;
  content: unknown;
}
