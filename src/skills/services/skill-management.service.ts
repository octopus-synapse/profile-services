/**
 * Skill Management Service
 *
 * Operations that require elevated permissions on skill resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: CRUD operations on skills requiring 'skill:*' permissions.
 */

import { Injectable } from '@nestjs/common';
import {
  ResumeNotFoundError,
  ResourceNotFoundError,
} from '@octopus-synapse/profile-contracts';
import { SkillManagementRepository } from '../repositories';

// ============================================================================
// Types
// ============================================================================

export class CreateSkillInput {
  name!: string;
  category!: string;
  level?: number;
}

export class UpdateSkillInput {
  name?: string;
  category?: string;
  level?: number;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class SkillManagementService {
  constructor(private readonly repository: SkillManagementRepository) {}

  // ============================================================================
  // Query Operations (require 'skill:read' or 'skill:manage')
  // ============================================================================

  /**
   * List all skills for a specific resume
   */
  async listSkillsForResume(resumeId: string) {
    await this.ensureResumeExists(resumeId);

    const skills = await this.repository.findAllByResumeId(resumeId);

    return { skills };
  }

  // ============================================================================
  // Mutation Operations (require 'skill:create', 'skill:update', 'skill:delete')
  // ============================================================================

  /**
   * Add a skill to any resume (elevated permission)
   */
  async addSkillToResume(resumeId: string, data: CreateSkillInput) {
    await this.ensureResumeExists(resumeId);

    const nextOrder = await this.getNextOrderValue(resumeId);

    const skill = await this.repository.create({
      resumeId,
      name: data.name,
      category: data.category,
      level: data.level,
      order: nextOrder,
    });

    return {
      success: true,
      skill,
      message: 'Skill added successfully',
    };
  }

  /**
   * Update any skill (elevated permission)
   */
  async updateSkill(skillId: string, data: UpdateSkillInput) {
    await this.ensureSkillExists(skillId);

    const skill = await this.repository.update(skillId, data);

    return {
      success: true,
      skill,
      message: 'Skill updated successfully',
    };
  }

  /**
   * Delete any skill (elevated permission)
   */
  async deleteSkill(skillId: string) {
    await this.ensureSkillExists(skillId);

    await this.repository.delete(skillId);

    return {
      success: true,
      message: 'Skill deleted successfully',
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async getNextOrderValue(resumeId: string): Promise<number> {
    const lastSkill = await this.repository.findLastByOrder(resumeId);

    return (lastSkill?.order ?? -1) + 1;
  }

  private async ensureResumeExists(resumeId: string): Promise<void> {
    const resume = await this.repository.findResumeById(resumeId);

    if (!resume) {
      throw new ResumeNotFoundError(resumeId);
    }
  }

  private async ensureSkillExists(skillId: string): Promise<void> {
    const skill = await this.repository.findById(skillId);

    if (!skill) {
      throw new ResourceNotFoundError('skill', skillId);
    }
  }
}
