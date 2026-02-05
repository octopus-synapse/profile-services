/**
 * Spoken Languages Catalog DTOs
 *
 * Domain types and validation schemas for the spoken languages catalog
 * (e.g., English, Portuguese, Spanish, etc.).
 */

import { z } from "zod";

// ============================================================================
// Spoken Language Catalog
// ============================================================================

export const SpokenLanguageCatalogSchema = z.object({
  id: z.string().cuid(),
  code: z.string().length(2), // ISO 639-1 code (e.g., "en", "pt", "es")
  nameEn: z.string(),
  namePtBr: z.string(),
  nameEs: z.string(),
  nativeName: z.string().nullable(),
});

export type SpokenLanguageCatalog = z.infer<typeof SpokenLanguageCatalogSchema>;

export const SpokenLanguagesListSchema = z.array(SpokenLanguageCatalogSchema);
export type SpokenLanguagesList = z.infer<typeof SpokenLanguagesListSchema>;

// Alias for simpler use case
export type SpokenLanguage = SpokenLanguageCatalog;
