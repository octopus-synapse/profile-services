/**
 * Skill Management Service
 *
 * Operations that require elevated permissions on skill resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: CRUD operations on skills requiring 'skill:*' permissions.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';

const SKILL_SECTION_TYPE_KEY = 'skill_set_v1';

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
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // Query Operations (require 'skill:read' or 'skill:manage')
  // ============================================================================

  /**
   * List all skills for a specific resume
   */
  async listSkillsForResume(resumeId: string) {
    await this.ensureResumeExists(resumeId);

    const resumeSection = await this.prisma.resumeSection.findFirst({
      where: {
        resumeId,
        sectionType: {
          key: SKILL_SECTION_TYPE_KEY,
        },
      },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const skills = (resumeSection?.items ?? []).map((item) =>
      this.toSkillResponse(item.id, resumeId, item.order, item.content),
    );

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

    const resumeSection = await this.ensureSkillSection(resumeId);
    const nextOrder = await this.getNextOrderValue(resumeSection.id);

    const skill = await this.prisma.sectionItem.create({
      data: {
        resumeSectionId: resumeSection.id,
        content: {
          name: data.name,
          category: data.category,
          ...(data.level !== undefined ? { level: data.level } : {}),
        },
        order: nextOrder,
      },
    });

    return {
      success: true,
      skill: this.toSkillResponse(skill.id, resumeId, skill.order, skill.content),
      message: 'Skill added successfully',
    };
  }

  /**
   * Update any skill (elevated permission)
   */
  async updateSkill(skillId: string, data: UpdateSkillInput) {
    const existingSkill = await this.ensureSkillExists(skillId);
    const currentContent = this.asRecord(existingSkill.content);

    const content = {
      ...currentContent,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.level !== undefined ? { level: data.level } : {}),
    };

    const skill = await this.prisma.sectionItem.update({
      where: { id: skillId },
      data: { content },
    });

    return {
      success: true,
      skill: this.toSkillResponse(
        skill.id,
        existingSkill.resumeSection.resumeId,
        skill.order,
        skill.content,
      ),
      message: 'Skill updated successfully',
    };
  }

  /**
   * Delete any skill (elevated permission)
   */
  async deleteSkill(skillId: string) {
    await this.ensureSkillExists(skillId);

    await this.prisma.sectionItem.delete({ where: { id: skillId } });

    return {
      success: true,
      message: 'Skill deleted successfully',
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async getNextOrderValue(resumeSectionId: string): Promise<number> {
    const lastSkill = await this.prisma.sectionItem.findFirst({
      where: { resumeSectionId },
      orderBy: { order: 'desc' },
    });

    return (lastSkill?.order ?? -1) + 1;
  }

  private async getSkillSectionTypeId(): Promise<string> {
    const sectionType = await this.prisma.sectionType.findUnique({
      where: { key: SKILL_SECTION_TYPE_KEY },
      select: { id: true },
    });

    if (!sectionType) {
      throw new NotFoundException('Skill section type not found');
    }

    return sectionType.id;
  }

  private async ensureSkillSection(resumeId: string): Promise<{ id: string }> {
    const sectionTypeId = await this.getSkillSectionTypeId();

    const resumeSection = await this.prisma.resumeSection.upsert({
      where: {
        resumeId_sectionTypeId: {
          resumeId,
          sectionTypeId,
        },
      },
      update: {},
      create: {
        resumeId,
        sectionTypeId,
      },
      select: { id: true },
    });

    return resumeSection;
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

  private async ensureSkillExists(skillId: string) {
    const skill = await this.prisma.sectionItem.findFirst({
      where: { id: skillId },
      include: {
        resumeSection: {
          select: {
            resumeId: true,
            sectionType: {
              select: { key: true },
            },
          },
        },
      },
    });

    if (!skill || skill.resumeSection.sectionType.key !== SKILL_SECTION_TYPE_KEY) {
      throw new NotFoundException(ERROR_MESSAGES.SKILL_NOT_FOUND);
    }

    return skill;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private toSkillResponse(skillId: string, resumeId: string, order: number, content: unknown) {
    const data = this.asRecord(content);

    return {
      id: skillId,
      resumeId,
      name: typeof data.name === 'string' ? data.name : '',
      category: typeof data.category === 'string' ? data.category : '',
      level: typeof data.level === 'number' ? data.level : undefined,
      order,
    };
  }
}
