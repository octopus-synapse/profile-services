/**
 * Skill Management Port
 *
 * Defines domain types and repository abstraction for skill management.
 * This is the contract between use cases and infrastructure.
 */

// ============================================================================
// Domain Types
// ============================================================================

export type Skill = {
  id: string;
  resumeId: string;
  name: string;
  category: string;
  level?: number;
  order: number;
};

export type CreateSkillData = {
  name: string;
  category: string;
  level?: number;
};

export type UpdateSkillData = {
  name?: string;
  category?: string;
  level?: number;
};

export type SectionItem = {
  id: string;
  order: number;
  content: unknown;
  resumeSection: {
    resumeId: string;
    sectionType: {
      key: string;
    };
  };
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class SkillManagementRepositoryPort {
  abstract resumeExists(resumeId: string): Promise<boolean>;

  abstract findSkillSectionWithItems(resumeId: string): Promise<{
    items: { id: string; order: number; content: unknown }[];
  } | null>;

  abstract ensureSkillSection(resumeId: string): Promise<{ id: string }>;

  abstract getNextOrderValue(resumeSectionId: string): Promise<number>;

  abstract createSkillItem(
    resumeSectionId: string,
    content: Record<string, unknown>,
    order: number,
  ): Promise<{ id: string; order: number; content: unknown }>;

  abstract findSkillById(skillId: string): Promise<SectionItem | null>;

  abstract updateSkillContent(
    skillId: string,
    content: Record<string, unknown>,
  ): Promise<{ id: string; order: number; content: unknown }>;

  abstract deleteSkill(skillId: string): Promise<void>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const SKILL_MANAGEMENT_USE_CASES = Symbol('SKILL_MANAGEMENT_USE_CASES');

export interface SkillManagementUseCases {
  listSkillsUseCase: {
    execute: (resumeId: string) => Promise<Skill[]>;
  };
  addSkillUseCase: {
    execute: (resumeId: string, data: CreateSkillData) => Promise<Skill>;
  };
  updateSkillUseCase: {
    execute: (skillId: string, data: UpdateSkillData) => Promise<Skill>;
  };
  deleteSkillUseCase: {
    execute: (skillId: string) => Promise<void>;
  };
}
