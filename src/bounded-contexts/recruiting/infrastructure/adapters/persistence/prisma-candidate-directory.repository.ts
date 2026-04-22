import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { CandidateDirectoryRepositoryPort, SearchableCandidateRecord } from '../../../domain';

/**
 * Prisma adapter for the `CandidateDirectoryRepositoryPort`.
 *
 * Loads up to `poolCap` opt-in candidates and rolls up their resume skills
 * into the flat string array the domain expects. The query is deliberately
 * narrow — it touches the user, their primary resume, and only
 * SKILL-kinded section items — so we stay within the 200-row bound the
 * use-case relies on.
 */

@Injectable()
export class PrismaCandidateDirectoryRepository implements CandidateDirectoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async loadSearchablePool(params: {
    excludeUserId: string;
    poolCap: number;
  }): Promise<ReadonlyArray<SearchableCandidateRecord>> {
    const rows = await this.prisma.user.findMany({
      where: {
        id: { not: params.excludeUserId },
        isActive: true,
        hasCompletedOnboarding: true,
        preferences: { profileVisibility: { in: ['public', 'link'] } },
      },
      take: params.poolCap,
      select: {
        id: true,
        name: true,
        username: true,
        photoURL: true,
        bio: true,
        primaryResume: {
          select: {
            primaryStack: true,
            resumeSections: {
              where: {
                sectionType: {
                  semanticKind: { contains: 'SKILL', mode: 'insensitive' },
                },
              },
              select: { items: { select: { content: true } } },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      userId: row.id,
      name: row.name,
      username: row.username,
      photoURL: row.photoURL,
      bio: row.bio,
      skills: this.rollupSkills(row.primaryResume),
    }));
  }

  private rollupSkills(
    resume: {
      primaryStack: string[] | null;
      resumeSections: Array<{ items: Array<{ content: unknown }> }>;
    } | null,
  ): string[] {
    if (!resume) return [];
    const skills = new Set<string>();
    for (const skill of resume.primaryStack ?? []) {
      if (typeof skill === 'string' && skill.trim()) skills.add(skill.trim());
    }
    for (const section of resume.resumeSections ?? []) {
      for (const item of section.items ?? []) {
        const content = item.content as Record<string, unknown> | null;
        const name = content?.name;
        if (typeof name === 'string' && name.trim()) skills.add(name.trim());
      }
    }
    return [...skills];
  }
}
