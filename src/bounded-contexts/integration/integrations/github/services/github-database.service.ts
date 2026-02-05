/**
 * GitHub Database Service
 * Single Responsibility: Database operations for GitHub sync
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';

@Injectable()
export class GitHubDatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyResumeOwnership(
    userId: string,
    resumeId: string,
    include?: Prisma.ResumeInclude,
  ) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include,
    });

    if (!resume) {
      throw new HttpException(
        ERROR_MESSAGES.RESUME_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (resume.userId !== userId) {
      throw new HttpException(
        ERROR_MESSAGES.ACCESS_DENIED,
        HttpStatus.FORBIDDEN,
      );
    }

    return resume;
  }

  async updateResumeGitHubStats(
    resumeId: string,
    githubUsername: string,
    totalStars: number,
  ) {
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
    contributions: Prisma.OpenSourceContributionCreateManyInput[],
    achievements: Prisma.AchievementCreateManyInput[],
  ) {
    return this.prisma.$transaction([
      this.prisma.openSourceContribution.deleteMany({
        where: { resumeId, projectUrl: { contains: 'github.com' } },
      }),
      ...(contributions.length > 0
        ? [
            this.prisma.openSourceContribution.createMany({
              data: contributions,
            }),
          ]
        : []),
      this.prisma.achievement.deleteMany({
        where: {
          resumeId,
          OR: [
            { type: 'github_stars' },
            { verificationUrl: { contains: `github.com/${githubUsername}` } },
          ],
        },
      }),
      ...(achievements.length > 0
        ? [this.prisma.achievement.createMany({ data: achievements })]
        : []),
    ]);
  }
}
