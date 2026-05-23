/**
 * Prisma adapter for `GitHubResumeRepositoryPort`. Owns the
 * `OPEN_SOURCE` / `ACHIEVEMENT` reconcile transaction (delete prior
 * github-sourced section items, insert the fresh batch) and the
 * sync-status read.
 */

import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeAccessDeniedException } from '@/bounded-contexts/presentation/domain/exceptions';
import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { GitHubAchievementContent } from '../../../domain/entities/github-achievement';
import type { GitHubContribution } from '../../../domain/entities/github-contribution';
import {
  GitHubResumeRepositoryPort,
  type ResumeGitHubSyncStatus,
} from '../../../domain/ports/github-resume.repository.port';
import { extractGitHubUsername } from '../../../domain/value-objects/github-username';

const OPEN_SOURCE_SEMANTIC_KIND = 'OPEN_SOURCE';
const ACHIEVEMENT_SEMANTIC_KIND = 'ACHIEVEMENT';

export class PrismaGitHubResumeRepository extends GitHubResumeRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async verifyResumeOwnership(userId: string, resumeId: string, include?: Prisma.ResumeInclude) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include,
    });
    if (!resume) throw new EntityNotFoundException('Resume', resumeId);
    if (resume.userId !== userId) throw new ResumeAccessDeniedException();
    return resume;
  }

  async updateResumeGitHubStats(
    resumeId: string,
    githubUsername: string,
    totalStars: number,
  ): Promise<void> {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { github: `https://github.com/${githubUsername}`, totalStars },
    });
  }

  async reconcileSyncedSections(
    resumeId: string,
    githubUsername: string,
    contributions: readonly GitHubContribution[],
    achievements: readonly GitHubAchievementContent[],
  ): Promise<void> {
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    operations.push(
      this.prisma.sectionItem.deleteMany({
        where: {
          resumeSection: {
            resumeId,
            sectionType: { semanticKind: OPEN_SOURCE_SEMANTIC_KIND },
          },
          content: { path: ['projectUrl'], string_contains: 'github.com' },
        },
      }),
    );

    if (contributions.length > 0) {
      const openSourceSection = await this.getOrCreateResumeSection(
        resumeId,
        OPEN_SOURCE_SEMANTIC_KIND,
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

    operations.push(
      this.prisma.sectionItem.deleteMany({
        where: {
          resumeSection: {
            resumeId,
            sectionType: { semanticKind: ACHIEVEMENT_SEMANTIC_KIND },
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

    if (achievements.length > 0) {
      const achievementSection = await this.getOrCreateResumeSection(
        resumeId,
        ACHIEVEMENT_SEMANTIC_KIND,
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
              content: this.toAchievementJson(achievement),
            })),
          }),
        );
      }
    }

    await this.prisma.$transaction(operations);
  }

  async getSyncStatus(userId: string, resumeId: string): Promise<ResumeGitHubSyncStatus> {
    const resume = await this.verifyResumeOwnership(userId, resumeId, {
      resumeSections: {
        where: {
          sectionType: {
            semanticKind: { in: [OPEN_SOURCE_SEMANTIC_KIND, ACHIEVEMENT_SEMANTIC_KIND] },
          },
        },
        include: {
          sectionType: { select: { semanticKind: true } },
          items: { select: { content: true } },
        },
      },
    });

    const sections =
      'resumeSections' in resume
        ? (resume.resumeSections as Array<{
            sectionType: { semanticKind: string };
            items: Array<{ content: unknown }>;
          }>)
        : [];

    const openSource = sections
      .filter((s) => s.sectionType.semanticKind === OPEN_SOURCE_SEMANTIC_KIND)
      .flatMap((s) =>
        s.items.filter((i) => {
          const c = this.asRecord(i.content);
          return typeof c.projectUrl === 'string' && c.projectUrl.includes('github.com');
        }),
      );

    const achievements = sections
      .filter((s) => s.sectionType.semanticKind === ACHIEVEMENT_SEMANTIC_KIND)
      .flatMap((s) =>
        s.items.filter((i) => {
          const c = this.asRecord(i.content);
          return c.type === 'github_stars';
        }),
      );

    const githubUrl = (resume as { github?: string | null }).github ?? null;
    return {
      hasSynced: openSource.length > 0 || achievements.length > 0,
      lastSyncedAt: resume.updatedAt,
      githubUrl: githubUrl ? `https://github.com/${extractGitHubUsername(githubUrl)}` : null,
      stats: {
        totalStars: (resume as { totalStars?: number }).totalStars ?? 0,
        openSourceProjects: openSource.length,
        achievements: achievements.length,
      },
    };
  }

  private async getOrCreateResumeSection(resumeId: string, semanticKind: string) {
    const sectionType = await this.prisma.sectionType.findFirst({
      where: { semanticKind, isActive: true },
      select: { id: true },
    });
    if (!sectionType) return null;
    return this.prisma.resumeSection.upsert({
      where: { resumeId_sectionTypeId: { resumeId, sectionTypeId: sectionType.id } },
      update: {},
      create: { resumeId, sectionTypeId: sectionType.id },
      select: { id: true },
    });
  }

  private toAchievementJson(a: GitHubAchievementContent): Prisma.InputJsonObject {
    return {
      type: a.type,
      title: a.title,
      description: a.description,
      verificationUrl: a.verificationUrl,
      achievedAt: a.achievedAt,
      value: a.value,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }
}
