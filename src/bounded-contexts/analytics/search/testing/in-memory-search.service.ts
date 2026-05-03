/**
 * In-Memory Search Service for testing
 *
 * Pure test implementation following clean architecture.
 */

import { SearchServicePort } from '../ports';
import type {
  GlobalSearchGroup,
  GlobalSearchItem,
  GlobalSearchResult,
} from '../ports/search.port';
import type { SearchParams, SearchResult, SearchResultItem } from '../resume-search.service';

interface SeedUser {
  id: string;
  name?: string | null;
  username?: string | null;
  bio?: string | null;
}
interface SeedJob {
  id: string;
  title: string;
  company?: string;
  description?: string;
}
interface SeedPost {
  id: string;
  content?: string | null;
  type?: string;
}

export class InMemorySearchService implements SearchServicePort {
  private resumes: SearchResultItem[] = [];
  private suggestions: string[] = [];
  private users: SeedUser[] = [];
  private jobs: SeedJob[] = [];
  private posts: SeedPost[] = [];

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

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async globalSearch(query: string, limit = 5): Promise<GlobalSearchResult> {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) return { groups: [] };
    const cap = Math.max(1, Math.min(20, Number(limit) || 5));

    const resumeMatches = this.resumes
      .filter(
        (r) =>
          r.fullName?.toLowerCase().includes(trimmed) ||
          r.jobTitle?.toLowerCase().includes(trimmed) ||
          r.summary?.toLowerCase().includes(trimmed),
      )
      .slice(0, cap);
    const userMatches = this.users
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(trimmed) ||
          u.username?.toLowerCase().includes(trimmed) ||
          u.bio?.toLowerCase().includes(trimmed),
      )
      .slice(0, cap);
    const jobMatches = this.jobs
      .filter(
        (j) =>
          j.title.toLowerCase().includes(trimmed) ||
          j.company?.toLowerCase().includes(trimmed) ||
          j.description?.toLowerCase().includes(trimmed),
      )
      .slice(0, cap);
    const postMatches = this.posts
      .filter((p) => p.content?.toLowerCase().includes(trimmed))
      .slice(0, cap);

    const groups: GlobalSearchGroup[] = [
      {
        type: 'resumes',
        label: 'Currículos',
        items: resumeMatches.map<GlobalSearchItem>((r) => ({
          id: r.id,
          title: r.fullName ?? r.jobTitle ?? 'Untitled',
          snippet: r.summary ?? undefined,
          href: `/resumes/${r.slug ?? r.id}`,
        })),
      },
      {
        type: 'users',
        label: 'Pessoas',
        items: userMatches.map<GlobalSearchItem>((u) => ({
          id: u.id,
          title: u.name ?? u.username ?? 'User',
          snippet: u.bio ?? undefined,
          href: u.username ? `/u/${u.username}` : `/users/${u.id}`,
        })),
      },
      {
        type: 'jobs',
        label: 'Vagas',
        items: jobMatches.map<GlobalSearchItem>((j) => ({
          id: j.id,
          title: j.title,
          snippet: j.description,
          href: `/jobs/${j.id}`,
          badge: j.company,
        })),
      },
      {
        type: 'posts',
        label: 'Publicações',
        items: postMatches.map<GlobalSearchItem>((p) => ({
          id: p.id,
          title: (p.content ?? '').slice(0, 80) || 'Post',
          snippet: p.content ?? undefined,
          href: `/feed/${p.id}`,
          badge: p.type,
        })),
      },
    ];
    return { groups };
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

  seedUser(user: SeedUser): void {
    this.users.push(user);
  }
  seedJob(job: SeedJob): void {
    this.jobs.push(job);
  }
  seedPost(post: SeedPost): void {
    this.posts.push(post);
  }

  clear(): void {
    this.resumes = [];
    this.suggestions = [];
    this.users = [];
    this.jobs = [];
    this.posts = [];
  }
}
