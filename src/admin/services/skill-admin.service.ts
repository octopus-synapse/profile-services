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

  async getByResume(resumeId: string) {
    await this.ensureResumeExists(resumeId);

    const skills = await this.prisma.skill.findMany({
      where: { resumeId },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });

    return { skills };
  }

  async addToResume(resumeId: string, data: CreateSkillData) {
    await this.ensureResumeExists(resumeId);

    const order = await this.getNextOrder(resumeId);

    const skill = await this.prisma.skill.create({
      data: {
        resumeId,
        name: data.name,
        category: data.category,
        level: data.level,
        order,
      },
    });

    return {
      success: true,
      skill,
      message: 'Skill added successfully',
    };
  }

  async update(skillId: string, data: UpdateSkillData) {
    await this.ensureSkillExists(skillId);

    const updatedSkill = await this.prisma.skill.update({
      where: { id: skillId },
      data,
    });

    return {
      success: true,
      skill: updatedSkill,
      message: 'Skill updated successfully',
    };
  }

  async delete(skillId: string) {
    await this.ensureSkillExists(skillId);

    await this.prisma.skill.delete({ where: { id: skillId } });

    return {
      success: true,
      message: 'Skill deleted successfully',
    };
  }

  private async getNextOrder(resumeId: string): Promise<number> {
    const lastSkill = await this.prisma.skill.findFirst({
      where: { resumeId },
      orderBy: { order: 'desc' },
    });

    return (lastSkill?.order ?? -1) + 1;
  }

  private async ensureResumeExists(resumeId: string): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });
    if (!resume) {
      throw new NotFoundException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }
  }

  private async ensureSkillExists(skillId: string): Promise<void> {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
    });
    if (!skill) {
      throw new NotFoundException(ERROR_MESSAGES.SKILL_NOT_FOUND);
    }
  }
}
