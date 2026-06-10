/**
 * Zod schemas for `companies.routes.ts`.
 *
 * The companies BC powers the Add Experience "Company" autocomplete: a
 * read-only brand search proxied to logo.dev. The client stores the picked
 * `name` in the free-form `company` field and the `domain` in the hidden
 * `companyDomain` field (the logo URL is derived from the domain at render
 * time, so the secret search key never leaves the server).
 */

import { z } from 'zod';

export const CompanySuggestionSchema = z.object({
  name: z.string(),
  domain: z.string(),
});

export const CompaniesSearchResponseSchema = z.object({
  companies: z.array(CompanySuggestionSchema),
});
export type CompaniesSearchResponse = z.infer<typeof CompaniesSearchResponseSchema>;

/** Query for `GET /v1/companies/search`. Two chars minimum — short brands
 *  (XP, C6, 3M, GE) are real autocomplete targets. */
export const CompaniesSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});
export type CompaniesSearchQuery = z.infer<typeof CompaniesSearchQuerySchema>;
