/**
 * Search Service Port
 *
 * Interface for resume search operations following clean architecture.
 */

import type { SearchParams, SearchResult, SearchResultItem } from '../resume-search.service';

export const SEARCH_SERVICE_PORT = Symbol('SEARCH_SERVICE_PORT');

export interface SearchServicePort {
  search(params: SearchParams): Promise<SearchResult>;
  suggest(prefix: string, limit?: number): Promise<string[]>;
  findSimilar(resumeId: string, limit?: number): Promise<SearchResultItem[]>;
}
