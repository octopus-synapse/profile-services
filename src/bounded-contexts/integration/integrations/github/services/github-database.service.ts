/**
 * GitHub Database Service
 * Single Responsibility: Database operations for GitHub sync
 */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';
import { GitHubContributionInput } from './github-contribution.service';

const OPEN_SOURCE_SEMANTIC_KIND = 'OPEN_SOURCE';

@Injectable()
export class GitHubDatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyResumeOwnership(userId: string, resumeId: string, include?: Prisma.ResumeInclude) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include,
    });

    if (!resume) {
      throw new HttpException(ERROR_MESSAGES.RESUME_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (resume.userId !== userId) {
      throw new HttpException(ERROR_MESSAGES.ACCESS_DENIED, HttpStatus.FORBIDDEN);
    }

    return resume;
  }

  async updateResumeGitHubStats(resumeId: string, githubUsername: string, totalStars: number) {
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        github: `https://github.com/${githubUsername}`,
        totalStars,
      },
    });
  }

  async reconcileDbEntries(
    resumeId: string,
    githubUsername: string,
    contributions: GitHubContributionInput[],
    achievements: Prisma.AchievementCreateManyInput[],
  ) {
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    operations.push(
      this.prisma.sectionItem.deleteMany({
        where: {
          resumeSection: {
            resumeId,
            sectionType: {
              semanticKind: OPEN_SOURCE_SEMANTIC_KIND,
            },
          },
          content: {
            path: ['projectUrl'],
            string_contains: 'github.com',
          },
        },
      }),
    );

    if (contributions.length > 0) {
      const sectionType = await this.prisma.sectionType.findFirst({
        where: {
          semanticKind: OPEN_SOURCE_SEMANTIC_KIND,
          isActive: true,
        },
        orderBy: { version: 'desc' },
        select: { id: true },
      });

      if (sectionType) {
        const resumeSection = await this.prisma.resumeSection.upsert({
          where: {
            resumeId_sectionTypeId: {
              resumeId,
              sectionTypeId: sectionType.id,
            },
          },
          update: {},
          create: {
            resumeId,
            sectionTypeId: sectionType.id,
          },
          select: { id: true },
        });

        operations.push(
          this.prisma.sectionItem.createMany({
            data: contributions.map((contribution, index) => ({
              resumeSectionId: resumeSection.id,
              order: index,
              content: {
                projectName: contribution.projectName,
                projectUrl: contribution.projectUrl,
                role: contribution.role,
                description: contribution.description,
                technologies: contribution.technologies,
                commits: contribution.commits,
                prsCreated: contribution.prsCreated,
                stars: contribution.stars,
                startDate: contribution.startDate,
                isCurrent: contribution.isCurrent,
              },
            })),
          }),
        );
      }
    }

    operations.push(
      this.prisma.achievement.deleteMany({
        where: {
          resumeId,
          OR: [
            { type: 'github_stars' },
            { verificationUrl: { contains: `github.com/${githubUsername}` } },
          ],
        },
      }),
    );

    if (achievements.length > 0) {
      operations.push(this.prisma.achievement.createMany({ data: achievements }));
    }

    return this.prisma.$transaction(operations);
  }
}
