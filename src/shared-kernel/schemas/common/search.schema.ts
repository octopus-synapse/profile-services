/**
 * Search DTOs
 *
 * Domain types and validation schemas for resume/profile search functionality.
 * Supports full-text search, filtering, suggestions, and similar profiles.
 */

import { z } from 'zod';

// ============================================================================
// Search Enums
// ============================================================================

export const SearchSortBySchema = z.enum(['relevance', 'date', 'experience']);
export type SearchSortBy = z.infer<typeof SearchSortBySchema>;

export const SuggestionTypeSchema = z.enum(['skill', 'location', 'title', 'name']);
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;

// ============================================================================
// Search Query
// ============================================================================

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
  minExp: z.number().int().nonnegative().optional(),
  maxExp: z.number().int().nonnegative().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: SearchSortBySchema.default('relevance'),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// ============================================================================
// Search Result Item
// ============================================================================

export const SearchResultItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  name: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experienceYears: z.number().optional(),
  score: z.number().optional(),
  highlights: z.array(z.string()).optional(),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

// ============================================================================
// Search Response (Paginated)
// ============================================================================

export const SearchResponseSchema = z.object({
  items: z.array(SearchResultItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// ============================================================================
// Suggestions (Autocomplete)
// ============================================================================

export const SuggestionSchema = z.object({
  text: z.string(),
  type: SuggestionTypeSchema.optional(),
  score: z.number().optional(),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SuggestionsResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema),
});

export type SuggestionsResponse = z.infer<typeof SuggestionsResponseSchema>;

// ============================================================================
// Similar Profiles
// ============================================================================

export const SimilarProfileSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  title: z.string().optional(),
  similarity: z.number(),
  matchingSkills: z.array(z.string()).optional(),
});

export type SimilarProfile = z.infer<typeof SimilarProfileSchema>;

export const SimilarProfilesResponseSchema = z.object({
  profiles: z.array(SimilarProfileSchema),
});

export type SimilarProfilesResponse = z.infer<typeof SimilarProfilesResponseSchema>;
