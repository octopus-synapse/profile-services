/**
 * Skill Admin Service
 * Single Responsibility: Admin operations on skills
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';

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

@Injectable()
export class SkillAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSkillsForResume(resumeId: string) {
    await this.ensureResumeExists(resumeId);

    const resumeSkills = await this.prisma.skill.findMany({
      where: { resumeId },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });

    return { skills: resumeSkills };
  }

  async addSkillToResume(resumeId: string, skillData: CreateSkillData) {
    await this.ensureResumeExists(resumeId);

    const nextOrderValue = await this.getNextOrderValue(resumeId);

    const createdSkill = await this.prisma.skill.create({
      data: {
        resumeId,
        name: skillData.name,
        category: skillData.category,
        level: skillData.level,
        order: nextOrderValue,
      },
    });

    return {
      success: true,
      skill: createdSkill,
      message: 'Skill added successfully',
    };
  }

  async updateSkill(skillId: string, updateSkillData: UpdateSkillData) {
    await this.ensureSkillExists(skillId);

    const updatedSkill = await this.prisma.skill.update({
      where: { id: skillId },
      data: updateSkillData,
    });

    return {
      success: true,
      skill: updatedSkill,
      message: 'Skill updated successfully',
    };
  }

  async deleteSkill(skillId: string) {
    await this.ensureSkillExists(skillId);

    await this.prisma.skill.delete({ where: { id: skillId } });

    return {
      success: true,
      message: 'Skill deleted successfully',
    };
  }

  private async getNextOrderValue(resumeId: string): Promise<number> {
    const lastSkillInResume = await this.prisma.skill.findFirst({
      where: { resumeId },
      orderBy: { order: 'desc' },
    });

    return (lastSkillInResume?.order ?? -1) + 1;
  }

  private async ensureResumeExists(resumeId: string): Promise<void> {
    const existingResume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });
    if (!existingResume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }
  }

  private async ensureSkillExists(skillId: string): Promise<void> {
    const existingSkill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    });
    if (!existingSkill) {
      throw new NotFoundException(ERROR_MESSAGES.SKILL_NOT_FOUND);
    }
  }
}
