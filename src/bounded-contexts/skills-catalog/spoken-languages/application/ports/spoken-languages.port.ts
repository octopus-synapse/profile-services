/**
 * Spoken Languages Port
 *
 * Defines domain types and repository abstraction for spoken language queries.
 */

// ============================================================================
// Domain Types
// ============================================================================

export interface SpokenLanguage {
  code: string;
  nameEn: string;
  namePtBr: string;
  nameEs: string;
  nativeName: string | null;
}

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class SpokenLanguagesRepositoryPort {
  abstract findAllActive(): Promise<SpokenLanguage[]>;

  abstract searchByName(
    query: string,
    limit: number,
  ): Promise<SpokenLanguage[]>;

  abstract findByCode(code: string): Promise<SpokenLanguage | null>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const SPOKEN_LANGUAGES_USE_CASES = Symbol('SPOKEN_LANGUAGES_USE_CASES');

export interface SpokenLanguagesUseCases {
  getActiveSpokenLanguagesUseCase: {
    execute: () => Promise<SpokenLanguage[]>;
  };
  searchSpokenLanguagesUseCase: {
    execute: (query: string, limit?: number) => Promise<SpokenLanguage[]>;
  };
  getSpokenLanguageByCodeUseCase: {
    execute: (code: string) => Promise<SpokenLanguage | null>;
  };
}
