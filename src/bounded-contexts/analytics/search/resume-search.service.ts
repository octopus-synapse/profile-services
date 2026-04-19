/**
 * Resume Search Service
 *
 * Full-text search for public resumes using PostgreSQL.
 *
 * Robert C. Martin: "Single Responsibility"
 * - Search: handles query execution
 * - Suggestion: provides autocomplete
 * - Similar: finds related resumes
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

/**
 * Search query parameters
 */
export interface SearchParams {
  query: string;
  skills?: string[];
  location?: string;
  minExperienceYears?: number;
  maxExperienceYears?: number;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'views';
}

/**
 * Search result item
 */
export interface SearchResultItem {
  id: string;
  userId: string;
  fullName: string | null;
  jobTitle: string | null;
  summary: string | null;
  slug: string | null;
  location: string | null;
  profileViews: number;
  createdAt: Date;
  skills?: string[];
  rank?: number;
}

/**
 * Paginated search result
 */
export interface SearchResult {
  data: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ResumeSearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search public resumes with full-text search
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      skills,
      location,
      minExperienceYears,
      maxExperienceYears,
      page = 1,
      limit = 20,
      sortBy = 'relevance',
    } = params;

    const safeLimit = Number(limit) || 20;
    const safePage = Number(page) || 1;
    const offset = (safePage - 1) * safeLimit;
    const searchTerms = this.normalizeSearchTerms(query);

    // Build dynamic WHERE conditions as Prisma.Sql fragments so values are
    // bound through Prisma's parameterizer (avoids `$N` collisions when the
    // outer template also injects values like LIMIT/OFFSET).
    const conditions: Prisma.Sql[] = [Prisma.sql`"isPublic" = true`];

    if (searchTerms) {
      const like = `%${searchTerms}%`;
      conditions.push(Prisma.sql`(
        "fullName" ILIKE ${like} OR
        "jobTitle" ILIKE ${like} OR
        "summary" ILIKE ${like} OR
        "techPersona" ILIKE ${like}
      )`);
    }

    if (location) {
      conditions.push(Prisma.sql`"location" ILIKE ${`%${location}%`}`);
    }

    if (minExperienceYears !== undefined) {
      conditions.push(Prisma.sql`"experienceYears" >= ${minExperienceYears}`);
    }

    if (maxExperienceYears !== undefined) {
      conditions.push(Prisma.sql`"experienceYears" <= ${maxExperienceYears}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');
    const orderClause = this.buildOrderClauseSql(sortBy);

    const searchQuery = Prisma.sql`
      SELECT
        id,
        "userId",
        "fullName",
        "jobTitle",
        summary,
        slug,
        location,
        "profileViews",
        "createdAt"
      FROM "Resume"
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ${safeLimit}
      OFFSET ${offset}
    `;

    const countQuery = Prisma.sql`
      SELECT COUNT(*)::int as count
      FROM "Resume"
      WHERE ${whereClause}
    `;

    const [results, countResult] = await Promise.all([
      this.prisma.$queryRaw<SearchResultItem[]>(searchQuery),
      this.prisma.$queryRaw<[{ count: number }]>(countQuery),
    ]);

    // Filter by skills if provided (post-query filter for simplicity)
    let filteredResults = results;
    if (skills && skills.length > 0) {
      filteredResults = await this.filterBySkills(results, skills);
    }

    const total = countResult[0].count;

    return {
      data: filteredResults,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async suggest(prefix: string, limit = 10): Promise<string[]> {
    const normalizedPrefix = this.normalizeSearchTerms(prefix);

    const suggestions = await this.prisma.$queryRaw<{ suggestion: string }[]>`
      SELECT DISTINCT "jobTitle" as suggestion
      FROM "Resume"
      WHERE "isPublic" = true
        AND "jobTitle" ILIKE ${`${normalizedPrefix}%`}
      UNION
      SELECT DISTINCT "techPersona" as suggestion
      FROM "Resume"
      WHERE "isPublic" = true
        AND "techPersona" ILIKE ${`${normalizedPrefix}%`}
      LIMIT ${limit}
    `;

    return suggestions.map((s) => s.suggestion).filter(Boolean);
  }

  /**
   * Find similar resumes based on shared characteristics
   */
  async findSimilar(resumeId: string, limit = 5): Promise<SearchResultItem[]> {
    // Get source resume
    const sourceResume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        resumeSections: {
          where: {
            sectionType: {
              semanticKind: { contains: 'SKILL', mode: 'insensitive' },
            },
          },
          include: {
            items: {
              select: {
                content: true,
              },
            },
          },
        },
      },
    });

    if (!sourceResume) {
      return [];
    }

    const skillNames = this.extractSkillNames(sourceResume.resumeSections);

    if (skillNames.length === 0) {
      return [];
    }

    const candidates = await this.prisma.resume.findMany({
      where: {
        isPublic: true,
        id: { not: resumeId },
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        jobTitle: true,
        summary: true,
        slug: true,
        location: true,
        profileViews: true,
        createdAt: true,
        resumeSections: {
          where: {
            sectionType: {
              semanticKind: { contains: 'SKILL', mode: 'insensitive' },
            },
          },
          include: {
            items: {
              select: {
                content: true,
              },
            },
          },
        },
      },
    });

    const ranked = candidates
      .map((resume) => {
        const candidateSkills = this.extractSkillNames(resume.resumeSections);
        const sharedSkills = candidateSkills.filter((skill) => skillNames.includes(skill));

        return {
          id: resume.id,
          userId: resume.userId,
          fullName: resume.fullName,
          jobTitle: resume.jobTitle,
          summary: resume.summary,
          slug: resume.slug,
          location: resume.location,
          profileViews: resume.profileViews,
          createdAt: resume.createdAt,
          sharedSkillCount: sharedSkills.length,
        };
      })
      .filter((resume) => resume.sharedSkillCount > 0)
      .sort((a, b) => {
        if (b.sharedSkillCount !== a.sharedSkillCount) {
          return b.sharedSkillCount - a.sharedSkillCount;
        }

        return b.profileViews - a.profileViews;
      })
      .slice(0, limit)
      .map(({ sharedSkillCount: _sharedSkillCount, ...resume }) => resume);

    return ranked;
  }

  /**
   * Normalize search terms for consistent matching
   */
  private normalizeSearchTerms(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Build ORDER BY clause as a Prisma.Sql fragment so it can be safely
   * interpolated inside a Prisma.sql template.
   */
  private buildOrderClauseSql(sortBy: string): Prisma.Sql {
    switch (sortBy) {
      case 'date':
        return Prisma.sql`"createdAt" DESC`;
      case 'views':
        return Prisma.sql`"profileViews" DESC`;
      default:
        return Prisma.sql`"profileViews" DESC, "createdAt" DESC`;
    }
  }

  /**
   * Filter results by skills (post-query)
   */
  private async filterBySkills(
    results: SearchResultItem[],
    skills: string[],
  ): Promise<SearchResultItem[]> {
    if (results.length === 0) return results;

    const resumeIds = results.map((r) => r.id);
    const normalizedSkills = skills.map((s) => s.toLowerCase());

    const items = await this.prisma.sectionItem.findMany({
      where: {
        resumeSection: {
          resumeId: { in: resumeIds },
          sectionType: {
            semanticKind: { contains: 'SKILL', mode: 'insensitive' },
          },
        },
      },
      select: {
        resumeSection: {
          select: { resumeId: true },
        },
        content: true,
      },
    });

    const matchingIds = new Set<string>();
    for (const item of items) {
      const content = this.asRecord(item.content);
      const name = typeof content.name === 'string' ? content.name.toLowerCase() : '';

      if (normalizedSkills.includes(name)) {
        matchingIds.add(item.resumeSection.resumeId);
      }
    }

    return results.filter((r) => matchingIds.has(r.id));
  }

  private extractSkillNames(sections: Array<{ items: Array<{ content: unknown }> }>): string[] {
    const skills: string[] = [];

    for (const section of sections) {
      for (const item of section.items) {
        const content = this.asRecord(item.content);
        if (typeof content.name === 'string') {
          skills.push(content.name.toLowerCase());
        }
      }
    }

    return skills;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }
}
