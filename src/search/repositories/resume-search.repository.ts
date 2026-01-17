/**
 * Resume Search Repository
 * Data access layer for resume search operations
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

@Injectable()
export class ResumeSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a raw search query and count query
   */
  async executeSearch(
    whereClause: string,
    orderClause: string,
    limit: number,
    offset: number,
  ): Promise<{ results: SearchResultItem[]; total: number }> {
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

    return {
      results,
      total: countResult[0].count,
    };
  }

  /**
   * Get job title and tech persona suggestions
   */
  async getSuggestions(
    normalizedPrefix: string,
    limit: number,
  ): Promise<{ suggestion: string }[]> {
    return this.prisma.$queryRaw<{ suggestion: string }[]>`
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
  }

  /**
   * Find a resume by ID with skills
   */
  async findResumeWithSkills(
    resumeId: string,
  ): Promise<{ id: string; skills: { name: string }[] } | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: { skills: true },
    });
  }

  /**
   * Find similar resumes based on shared skills
   */
  async findSimilarResumes(
    resumeId: string,
    skillNames: string[],
    limit: number,
  ): Promise<SearchResultItem[]> {
    return this.prisma.$queryRaw<SearchResultItem[]>`
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
  }

  /**
   * Find skills by resume IDs and skill names
   */
  async findSkillsByResumeIds(
    resumeIds: string[],
    skillNames: string[],
  ): Promise<{ resumeId: string }[]> {
    return this.prisma.skill.findMany({
      where: {
        resumeId: { in: resumeIds },
        name: { in: skillNames, mode: 'insensitive' },
      },
      select: { resumeId: true },
    });
  }
}
