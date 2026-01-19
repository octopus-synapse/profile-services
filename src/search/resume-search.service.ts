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
import { ResumeSearchRepository, type SearchResultItem } from './repositories';

export type { SearchResultItem };

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
  constructor(private readonly repository: ResumeSearchRepository) {}

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
    const { results, total } = await this.repository.executeSearch(
      whereClause,
      orderClause,
      limit,
      offset,
    );

    // Filter by skills if provided (post-query filter for simplicity)
    let filteredResults = results;
    if (skills && skills.length > 0) {
      filteredResults = await this.filterBySkills(results, skills);
    }

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

    const suggestions = await this.repository.getSuggestions(
      normalizedPrefix,
      limit,
    );

    return suggestions.map((s) => s.suggestion).filter(Boolean);
  }

  /**
   * Find similar resumes based on shared characteristics
   */
  async findSimilar(resumeId: string, limit = 5): Promise<SearchResultItem[]> {
    // Get source resume
    const sourceResume = await this.repository.findResumeWithSkills(resumeId);

    if (!sourceResume) {
      return [];
    }

    const skillNames = sourceResume.skills.map((s) => s.name);

    // Find resumes with similar skills
    return this.repository.findSimilarResumes(resumeId, skillNames, limit);
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

    const resumesWithSkills = await this.repository.findSkillsByResumeIds(
      resumeIds,
      normalizedSkills,
    );

    const matchingIds = new Set(resumesWithSkills.map((s) => s.resumeId));
    return results.filter((r) => matchingIds.has(r.id));
  }
}
