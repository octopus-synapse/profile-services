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

import { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { GlobalSearchGroup, GlobalSearchItem, GlobalSearchResult } from './ports/search.port';
import {
  buildOrderClauseSql,
  extractSkillNames,
  filterResultsBySkills,
  normalizeSearchTerms,
} from './resume-search.helpers';
import type { SearchParams, SearchResult, SearchResultItem } from './resume-search.types';

export type { SearchParams, SearchResult, SearchResultItem };

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
    const searchTerms = normalizeSearchTerms(query);

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
    const orderClause = buildOrderClauseSql(sortBy);

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
      filteredResults = await filterResultsBySkills(this.prisma, results, skills);
    }

    const total = countResult[0].count;

    const totalPages = Math.ceil(total / limit);
    return {
      items: filteredResults,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async suggest(prefix: string, limit = 10): Promise<string[]> {
    const normalizedPrefix = normalizeSearchTerms(prefix);

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
              select: { content: true },
            },
          },
        },
      },
    });

    if (!sourceResume) {
      return [];
    }

    const skillNames = extractSkillNames(sourceResume.resumeSections);

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
              select: { content: true },
            },
          },
        },
      },
    });

    const ranked = candidates
      .map((resume) => {
        const candidateSkills = extractSkillNames(resume.resumeSections);
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
   * Multi-type search across resumes, users, jobs, posts. Each group is
   * capped at `limit`; results are returned in the canonical group order
   * the frontend expects.
   */
  async globalSearch(query: string, limit = 5): Promise<GlobalSearchResult> {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return { groups: [] };
    }
    const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));
    const insensitive = { mode: 'insensitive' as const };

    const [resumeResult, userRows, jobRows, postRows] = await Promise.all([
      this.search({ query: trimmed, page: 1, limit: safeLimit }),
      this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: trimmed, ...insensitive } },
            { username: { contains: trimmed, ...insensitive } },
            { bio: { contains: trimmed, ...insensitive } },
          ],
        },
        select: { id: true, name: true, username: true, bio: true, photoURL: true },
        take: safeLimit,
      }),
      this.prisma.job.findMany({
        where: {
          OR: [
            { title: { contains: trimmed, ...insensitive } },
            { description: { contains: trimmed, ...insensitive } },
            { company: { contains: trimmed, ...insensitive } },
          ],
        },
        select: { id: true, title: true, company: true, description: true, location: true },
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.findMany({
        where: { content: { contains: trimmed, ...insensitive } },
        select: { id: true, content: true, type: true, authorId: true },
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const resumeItems: GlobalSearchItem[] = resumeResult.items.map((row) => ({
      id: row.id,
      title: row.fullName ?? row.jobTitle ?? 'Untitled',
      snippet: row.summary ? row.summary.slice(0, 160) : undefined,
      href: `/resumes/${row.slug ?? row.id}`,
    }));
    const userItems: GlobalSearchItem[] = userRows.map((u) => ({
      id: u.id,
      title: u.name ?? u.username ?? 'User',
      snippet: u.bio ? u.bio.slice(0, 160) : undefined,
      href: u.username ? `/u/${u.username}` : `/users/${u.id}`,
    }));
    const jobItems: GlobalSearchItem[] = jobRows.map((j) => ({
      id: j.id,
      title: j.title,
      snippet: j.description.slice(0, 160),
      href: `/jobs/${j.id}`,
      badge: j.company,
    }));
    const postItems: GlobalSearchItem[] = postRows.map((p) => ({
      id: p.id,
      title: (p.content ?? '').slice(0, 80) || 'Post',
      snippet: p.content ? p.content.slice(0, 160) : undefined,
      href: `/feed/${p.id}`,
      badge: p.type,
    }));

    const groups: GlobalSearchGroup[] = [
      { type: 'resumes', label: 'Currículos', items: resumeItems },
      { type: 'users', label: 'Pessoas', items: userItems },
      { type: 'jobs', label: 'Vagas', items: jobItems },
      { type: 'posts', label: 'Publicações', items: postItems },
    ];
    return { groups };
  }

  /**
   * Normalize search terms for consistent matching
   */
}
