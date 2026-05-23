/** Search query parameters */
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

/** Search result item */
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

/** Paginated search result */
export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
