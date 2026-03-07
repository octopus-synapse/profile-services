/**
 * In-Memory Search Service for testing
 *
 * Pure test implementation following clean architecture.
 */

import type { SearchServicePort } from '../ports';
import type { SearchParams, SearchResult, SearchResultItem } from '../resume-search.service';

export class InMemorySearchService implements SearchServicePort {
  private resumes: SearchResultItem[] = [];
  private suggestions: string[] = [];

  async search(params: SearchParams): Promise<SearchResult> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    let filtered = [...this.resumes];

    // Apply basic filtering
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.fullName?.toLowerCase().includes(query) ||
          r.jobTitle?.toLowerCase().includes(query) ||
          r.summary?.toLowerCase().includes(query),
      );
    }

    if (params.location) {
      const location = params.location.toLowerCase();
      filtered = filtered.filter((r) => r.location?.toLowerCase().includes(location));
    }

    if (params.skills?.length) {
      filtered = filtered.filter((r) =>
        params.skills?.some((skill) =>
          r.skills?.some((s) => s.toLowerCase().includes(skill.toLowerCase())),
        ),
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async suggest(prefix: string, limit = 10): Promise<string[]> {
    return this.suggestions
      .filter((s) => s.toLowerCase().startsWith(prefix.toLowerCase()))
      .slice(0, limit);
  }

  async findSimilar(resumeId: string, limit = 5): Promise<SearchResultItem[]> {
    const resume = this.resumes.find((r) => r.id === resumeId);
    if (!resume) return [];

    // Simple similarity: same skills
    return this.resumes
      .filter((r) => r.id !== resumeId)
      .filter((r) => r.skills?.some((skill) => resume.skills?.includes(skill)))
      .slice(0, limit);
  }

  // Test helpers
  seedResume(resume: Partial<SearchResultItem>): void {
    this.resumes.push({
      id: resume.id ?? `resume-${this.resumes.length + 1}`,
      userId: resume.userId ?? 'user-1',
      fullName: resume.fullName ?? null,
      jobTitle: resume.jobTitle ?? null,
      summary: resume.summary ?? null,
      slug: resume.slug ?? null,
      location: resume.location ?? null,
      profileViews: resume.profileViews ?? 0,
      createdAt: resume.createdAt ?? new Date(),
      skills: resume.skills ?? [],
    });
  }

  seedSuggestions(suggestions: string[]): void {
    this.suggestions = suggestions;
  }

  clear(): void {
    this.resumes = [];
    this.suggestions = [];
  }
}
