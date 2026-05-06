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
  abstract listActive(): Promise<SpokenLanguage[]>;

  abstract searchByName(query: string, limit: number): Promise<SpokenLanguage[]>;

  abstract findByCode(code: string): Promise<SpokenLanguage | null>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class SpokenLanguagesUseCases {
  abstract readonly getActiveSpokenLanguagesUseCase: { execute: () => Promise<SpokenLanguage[]> };
  abstract readonly searchSpokenLanguagesUseCase: {
    execute: (query: string, limit?: number) => Promise<SpokenLanguage[]>;
  };
  abstract readonly getSpokenLanguageByCodeUseCase: {
    execute: (code: string) => Promise<SpokenLanguage | null>;
  };
}
