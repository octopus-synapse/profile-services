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

    const offset = (page - 1) * limit;
    const searchTerms = this.normalizeSearchTerms(query);

    // Build dynamic WHERE conditions
    const conditions: string[] = ['"isPublic" = true'];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Full-text search condition
    if (searchTerms) {
      conditions.push(`(
        "fullName" ILIKE $${paramIndex} OR
        "jobTitle" ILIKE $${paramIndex} OR
        "summary" ILIKE $${paramIndex} OR
        "techPersona" ILIKE $${paramIndex}
      )`);
      values.push(`%${searchTerms}%`);
      paramIndex++;
    }

    // Location filter
    if (location) {
      conditions.push(`"location" ILIKE $${paramIndex}`);
      values.push(`%${location}%`);
      paramIndex++;
    }

    // Experience years filter
    if (minExperienceYears !== undefined) {
      conditions.push(`"experienceYears" >= $${paramIndex}`);
      values.push(minExperienceYears);
      paramIndex++;
    }

    if (maxExperienceYears !== undefined) {
      conditions.push(`"experienceYears" <= $${paramIndex}`);
      values.push(maxExperienceYears);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const orderClause = this.buildOrderClause(sortBy);

    // Execute search query
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
      WHERE ${Prisma.raw(whereClause)}
      ORDER BY ${Prisma.raw(orderClause)}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countQuery = Prisma.sql`
      SELECT COUNT(*)::int as count
      FROM "Resume"
      WHERE ${Prisma.raw(whereClause)}
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
      include: { skills: true },
    });

    if (!sourceResume) {
      return [];
    }

    const skillNames = sourceResume.skills.map((s) => s.name);

    // Find resumes with similar skills
    const similarResumes = await this.prisma.$queryRaw<SearchResultItem[]>`
      SELECT DISTINCT
        r.id,
        r."userId",
        r."fullName",
        r."jobTitle",
        r.summary,
        r.slug,
        r.location,
        r."profileViews",
        r."createdAt"
      FROM "Resume" r
      JOIN "Skill" s ON s."resumeId" = r.id
      WHERE r."isPublic" = true
        AND r.id != ${resumeId}
        AND s.name = ANY(${skillNames}::text[])
      GROUP BY r.id
      ORDER BY COUNT(s.id) DESC, r."profileViews" DESC
      LIMIT ${limit}
    `;

    return similarResumes;
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
   * Build ORDER BY clause based on sort option
   */
  private buildOrderClause(sortBy: string): string {
    switch (sortBy) {
      case 'date':
        return '"createdAt" DESC';
      case 'views':
        return '"profileViews" DESC';
      case 'relevance':
      default:
        return '"profileViews" DESC, "createdAt" DESC';
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

    const resumesWithSkills = await this.prisma.skill.findMany({
      where: {
        resumeId: { in: resumeIds },
        name: { in: normalizedSkills, mode: 'insensitive' },
      },
      select: { resumeId: true },
    });

    const matchingIds = new Set(resumesWithSkills.map((s) => s.resumeId));
    return results.filter((r) => matchingIds.has(r.id));
  }
}
