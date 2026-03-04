/**
 * Skill Management Service (Facade)
 *
 * Delegates to use cases following Clean Architecture.
 * Operations that require elevated permissions on skill resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: Facade that delegates to specific use cases.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  type CreateSkillData,
  SKILL_MANAGEMENT_USE_CASES,
  type Skill,
  type SkillManagementUseCases,
  type UpdateSkillData,
} from './skill-management/ports/skill-management.port';

// Re-export types for backwards compatibility
export type { CreateSkillData as CreateSkillInput, UpdateSkillData as UpdateSkillInput };

@Injectable()
export class SkillManagementService {
  constructor(
    @Inject(SKILL_MANAGEMENT_USE_CASES)
    private readonly useCases: SkillManagementUseCases,
  ) {}

  /**
   * List all skills for a specific resume
   * @returns Skill[] - Array of skills (domain data, not envelope)
   */
  async listSkillsForResume(resumeId: string): Promise<Skill[]> {
    return this.useCases.listSkillsUseCase.execute(resumeId);
  }

  /**
   * Add a skill to any resume (elevated permission)
   * @returns Skill - Created skill (domain data, not envelope)
   */
  async addSkillToResume(resumeId: string, data: CreateSkillData): Promise<Skill> {
    return this.useCases.addSkillUseCase.execute(resumeId, data);
  }

  /**
   * Update any skill (elevated permission)
   * @returns Skill - Updated skill (domain data, not envelope)
   */
  async updateSkill(skillId: string, data: UpdateSkillData): Promise<Skill> {
    return this.useCases.updateSkillUseCase.execute(skillId, data);
  }

  /**
   * Delete any skill (elevated permission)
   * @returns void (not envelope)
   */
  async deleteSkill(skillId: string): Promise<void> {
    return this.useCases.deleteSkillUseCase.execute(skillId);
  }
}
