/**
 * Skill Management Repository
 * Data access layer for skill management operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Skill, Resume } from '@prisma/client';

@Injectable()
export class SkillManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all skills for a resume
   */
  async findAllByResumeId(resumeId: string): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      where: { resumeId },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * Find the last skill by order for a resume
   */
  async findLastByOrder(resumeId: string): Promise<Skill | null> {
    return this.prisma.skill.findFirst({
      where: { resumeId },
      orderBy: { order: 'desc' },
    });
  }

  /**
   * Create a new skill
   */
  async create(data: {
    resumeId: string;
    name: string;
    category: string;
    level?: number;
    order: number;
  }): Promise<Skill> {
    return this.prisma.skill.create({ data });
  }

  /**
   * Update a skill by ID
   */
  async update(
    skillId: string,
    data: { name?: string; category?: string; level?: number },
  ): Promise<Skill> {
    return this.prisma.skill.update({
      where: { id: skillId },
      data,
    });
  }

  /**
   * Delete a skill by ID
   */
  async delete(skillId: string): Promise<void> {
    await this.prisma.skill.delete({ where: { id: skillId } });
  }

  /**
   * Find a skill by ID
   */
  async findById(skillId: string): Promise<Skill | null> {
    return this.prisma.skill.findUnique({
      where: { id: skillId },
      select: {
        id: true,
        resumeId: true,
        name: true,
        category: true,
        level: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<Skill | null>;
  }

  /**
   * Find a resume by ID (for validation)
   */
  async findResumeById(resumeId: string): Promise<Pick<Resume, 'id'> | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });
  }
}
