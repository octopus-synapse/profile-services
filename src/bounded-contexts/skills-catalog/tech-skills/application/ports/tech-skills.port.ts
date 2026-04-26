/**
 * Tech Skills Port
 *
 * Defines repository abstractions for tech skills queries.
 */

import type { ProgrammingLanguage } from '../../dto/programming-language.dto';
import type { TechArea } from '../../dto/tech-area.dto';
import type { TechNiche } from '../../dto/tech-niche.dto';
import type { TechSkill } from '../../dto/tech-skill.dto';
import type { SkillType, TechAreaType } from '../../interfaces';

// ============================================================================
// Repository Ports (Abstractions)
// ============================================================================

export abstract class TechSkillRepositoryPort {
  abstract findAllActive(): Promise<TechSkill[]>;
  abstract findByNiche(nicheSlug: string): Promise<TechSkill[]>;
  abstract findByType(type: SkillType, limit: number): Promise<TechSkill[]>;
  abstract searchSkills(query: string, limit: number): Promise<TechSkill[]>;
}

export abstract class TechAreaRepositoryPort {
  abstract findAllActive(): Promise<TechArea[]>;
}

export abstract class TechNicheRepositoryPort {
  abstract findAllActive(): Promise<TechNiche[]>;
  abstract findByAreaType(areaType: TechAreaType): Promise<TechNiche[]>;
}

export abstract class ProgrammingLanguageRepositoryPort {
  abstract findAllActive(): Promise<ProgrammingLanguage[]>;
  abstract search(query: string, limit: number): Promise<ProgrammingLanguage[]>;
}

// ============================================================================
// Cache Port (Abstraction)
// ============================================================================

export abstract class CachePort {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class TechSkillsUseCases {
  abstract readonly getAllSkillsUseCase: { execute: () => Promise<TechSkill[]> };
  abstract readonly getSkillsByNicheUseCase: {
    execute: (nicheSlug: string) => Promise<TechSkill[]>;
  };
  abstract readonly getSkillsByTypeUseCase: {
    execute: (type: SkillType, limit?: number) => Promise<TechSkill[]>;
  };
  abstract readonly searchSkillsUseCase: {
    execute: (query: string, limit?: number) => Promise<TechSkill[]>;
  };
  abstract readonly getAllAreasUseCase: { execute: () => Promise<TechArea[]> };
  abstract readonly getAllNichesUseCase: { execute: () => Promise<TechNiche[]> };
  abstract readonly getNichesByAreaUseCase: {
    execute: (areaType: TechAreaType) => Promise<TechNiche[]>;
  };
  abstract readonly getAllLanguagesUseCase: { execute: () => Promise<ProgrammingLanguage[]> };
  abstract readonly searchLanguagesUseCase: {
    execute: (query: string, limit?: number) => Promise<ProgrammingLanguage[]>;
  };
  abstract readonly searchAllUseCase: {
    execute: (
      query: string,
      limit?: number,
    ) => Promise<{ languages: ProgrammingLanguage[]; skills: TechSkill[] }>;
  };
}
