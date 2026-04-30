/**
 * Search Service Port
 *
 * Interface for resume search operations following clean architecture.
 */

import type { SearchParams, SearchResult, SearchResultItem } from '../resume-search.service';

export abstract class SearchServicePort {
  abstract search(params: SearchParams): Promise<SearchResult>;
  abstract suggest(prefix: string, limit?: number): Promise<string[]>;
  abstract findSimilar(resumeId: string, limit?: number): Promise<SearchResultItem[]>;
}
