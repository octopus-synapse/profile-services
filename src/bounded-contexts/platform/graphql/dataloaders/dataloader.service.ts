import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { Experience, Education, Skill } from '@prisma/client';

/**
 * DataLoader Factory
 *
 * Creates per-request DataLoaders to solve N+1 query problem.
 * Scoped as REQUEST to prevent cache pollution between requests.
 *
 * Issue #77: Implement DataLoader for N+1 optimization
 */
@Injectable({ scope: Scope.REQUEST })
export class DataLoaderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load experiences for multiple resume IDs
   * Batches multiple calls into a single Prisma query
   */
  createExperiencesLoader(): DataLoader<string, Experience[]> {
    return new DataLoader<string, Experience[]>(
      async (resumeIds: readonly string[]) => {
        const experiences = await this.prisma.experience.findMany({
          where: { resumeId: { in: [...resumeIds] } },
          orderBy: { order: 'asc' },
        });

        // Group by resumeId
        const experiencesByResumeId = new Map<string, Experience[]>();
        for (const exp of experiences) {
          const existing = experiencesByResumeId.get(exp.resumeId) ?? [];
          existing.push(exp);
          experiencesByResumeId.set(exp.resumeId, existing);
        }

        // Return in same order as input keys
        return resumeIds.map((id) => experiencesByResumeId.get(id) ?? []);
      },
    );
  }

  /**
   * Load educations for multiple resume IDs
   */
  createEducationsLoader(): DataLoader<string, Education[]> {
    return new DataLoader<string, Education[]>(
      async (resumeIds: readonly string[]) => {
        const educations = await this.prisma.education.findMany({
          where: { resumeId: { in: [...resumeIds] } },
          orderBy: { order: 'asc' },
        });

        const educationsByResumeId = new Map<string, Education[]>();
        for (const edu of educations) {
          const existing = educationsByResumeId.get(edu.resumeId) ?? [];
          existing.push(edu);
          educationsByResumeId.set(edu.resumeId, existing);
        }

        return resumeIds.map((id) => educationsByResumeId.get(id) ?? []);
      },
    );
  }

  /**
   * Load skills for multiple resume IDs
   */
  createSkillsLoader(): DataLoader<string, Skill[]> {
    return new DataLoader<string, Skill[]>(
      async (resumeIds: readonly string[]) => {
        const skills = await this.prisma.skill.findMany({
          where: { resumeId: { in: [...resumeIds] } },
          orderBy: { order: 'asc' },
        });

        const skillsByResumeId = new Map<string, Skill[]>();
        for (const skill of skills) {
          const existing = skillsByResumeId.get(skill.resumeId) ?? [];
          existing.push(skill);
          skillsByResumeId.set(skill.resumeId, existing);
        }

        return resumeIds.map((id) => skillsByResumeId.get(id) ?? []);
      },
    );
  }
}
