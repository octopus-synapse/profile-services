/**
 * GitHub Database Service
 * Single Responsibility: Database operations for GitHub sync
 *
 * GENERIC SECTIONS: Uses SectionItem for all data, not legacy models.
 */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { GitHubAchievementContent } from './github-achievement.service';
import { GitHubContributionInput } from './github-contribution.service';

const OPEN_SOURCE_SEMANTIC_KIND = 'OPEN_SOURCE';
const ACHIEVEMENT_SEMANTIC_KIND = 'ACHIEVEMENT';

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
    achievements: GitHubAchievementContent[],
  ) {
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    // Delete existing GitHub-sourced open source contributions
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

    // Create open source contributions as SectionItems
    if (contributions.length > 0) {
      const openSourceSection = await this.getOrCreateResumeSection(
        resumeId,
        OPEN_SOURCE_SEMANTIC_KIND,
        'open_source_v1',
      );

      if (openSourceSection) {
        operations.push(
          this.prisma.sectionItem.createMany({
            data: contributions.map((contribution, index) => ({
              resumeSectionId: openSourceSection.id,
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

    // Delete existing GitHub-sourced achievements
    operations.push(
      this.prisma.sectionItem.deleteMany({
        where: {
          resumeSection: {
            resumeId,
            sectionType: {
              semanticKind: ACHIEVEMENT_SEMANTIC_KIND,
            },
          },
          OR: [
            { content: { path: ['type'], equals: 'github_stars' } },
            {
              content: {
                path: ['verificationUrl'],
                string_contains: `github.com/${githubUsername}`,
              },
            },
          ],
        },
      }),
    );

    // Create achievements as SectionItems
    if (achievements.length > 0) {
      const achievementSection = await this.getOrCreateResumeSection(
        resumeId,
        ACHIEVEMENT_SEMANTIC_KIND,
        'achievement_v1',
      );

      if (achievementSection) {
        const existingCount = await this.prisma.sectionItem.count({
          where: { resumeSectionId: achievementSection.id },
        });

        operations.push(
          this.prisma.sectionItem.createMany({
            data: achievements.map((achievement, index) => ({
              resumeSectionId: achievementSection.id,
              order: existingCount + index,
              content: achievement as unknown as Prisma.InputJsonValue,
            })),
          }),
        );
      }
    }

    return this.prisma.$transaction(operations);
  }

  /**
   * Get or create a ResumeSection for a given semantic kind.
   */
  private async getOrCreateResumeSection(
    resumeId: string,
    semanticKind: string,
    sectionTypeKey: string,
  ) {
    const sectionType = await this.prisma.sectionType.findFirst({
      where: {
        key: sectionTypeKey,
        isActive: true,
      },
      select: { id: true },
    });

    if (!sectionType) {
      return null;
    }

    return this.prisma.resumeSection.upsert({
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
  }
}
