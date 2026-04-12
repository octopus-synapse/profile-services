/**
 * Search Port
 *
 * Defines the use cases interface and injection token for search.
 */

import type { SearchParams, SearchResult, SearchResultItem } from '../../resume-search.service';

export const SEARCH_USE_CASES = Symbol('SEARCH_USE_CASES');

export interface SearchUseCases {
  searchResumesUseCase: {
    execute: (params: SearchParams) => Promise<SearchResult>;
    suggest: (prefix: string, limit?: number) => Promise<string[]>;
    findSimilar: (resumeId: string, limit?: number) => Promise<SearchResultItem[]>;
  };
}
