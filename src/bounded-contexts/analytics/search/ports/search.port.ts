/**
 * Search Service Port
 *
 * Interface for resume search operations following clean architecture.
 */

import type { SearchParams, SearchResult, SearchResultItem } from '../resume-search.service';

export type GlobalSearchGroupType = 'users' | 'jobs' | 'resumes' | 'posts';

export interface GlobalSearchItem {
  readonly id: string;
  readonly title: string;
  readonly snippet?: string;
  readonly href: string;
  readonly badge?: string;
}

export interface GlobalSearchGroup {
  readonly type: GlobalSearchGroupType;
  readonly label: string;
  readonly items: readonly GlobalSearchItem[];
}

export interface GlobalSearchResult {
  readonly groups: readonly GlobalSearchGroup[];
}

export abstract class SearchServicePort {
  abstract search(params: SearchParams): Promise<SearchResult>;
  abstract suggest(prefix: string, limit?: number): Promise<string[]>;
  abstract findSimilar(resumeId: string, limit?: number): Promise<SearchResultItem[]>;
  abstract globalSearch(query: string, limit?: number): Promise<GlobalSearchResult>;
}
