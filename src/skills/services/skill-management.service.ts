/**
 * Skill Management Service
 *
 * Operations that require elevated permissions on skill resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: CRUD operations on skills requiring 'skill:*' permissions.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';

// ============================================================================
// Types
// ============================================================================

export interface CreateSkillInput {
  name: string;
  category: string;
  level?: number;
}

export interface UpdateSkillInput {
  name?: string;
  category?: string;
  level?: number;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class SkillManagementService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // Query Operations (require 'skill:read' or 'skill:manage')
  // ============================================================================

  /**
   * List all skills for a specific resume
   */
  async listSkillsForResume(resumeId: string) {
    await this.ensureResumeExists(resumeId);

    const skills = await this.prisma.skill.findMany({
      where: { resumeId },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });

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

    const skill = await this.prisma.skill.create({
      data: {
        resumeId,
        name: data.name,
        category: data.category,
        level: data.level,
        order: nextOrder,
      },
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

    const skill = await this.prisma.skill.update({
      where: { id: skillId },
      data,
    });

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

    await this.prisma.skill.delete({ where: { id: skillId } });

    return {
      success: true,
      message: 'Skill deleted successfully',
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async getNextOrderValue(resumeId: string): Promise<number> {
    const lastSkill = await this.prisma.skill.findFirst({
      where: { resumeId },
      orderBy: { order: 'desc' },
    });

    return (lastSkill?.order ?? -1) + 1;
  }

  private async ensureResumeExists(resumeId: string): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });

    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }
  }

  private async ensureSkillExists(skillId: string): Promise<void> {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      select: { id: true },
    });

    if (!skill) {
      throw new NotFoundException(ERROR_MESSAGES.SKILL_NOT_FOUND);
    }
  }
}
