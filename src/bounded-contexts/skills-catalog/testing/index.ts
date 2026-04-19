/**
 * Skills Catalog Testing Module
 *
 * Port-level in-memory fakes for testing skills catalog functionality.
 */

import {
  type SpokenLanguage,
  SpokenLanguagesRepositoryPort,
} from '../spoken-languages/application/ports/spoken-languages.port';
import {
  CachePort,
  TechSkillRepositoryPort,
} from '../tech-skills/application/ports/tech-skills.port';
import type { TechSkill } from '../tech-skills/dto/tech-skill.dto';
import type { SkillType } from '../tech-skills/interfaces';

// ═══════════════════════════════════════════════════════════════
// TYPES (test data carries the extra fields needed by seeds)
// ═══════════════════════════════════════════════════════════════

export interface TechSkillData extends TechSkill {
  isActive: boolean;
}

export interface SpokenLanguageData extends SpokenLanguage {
  isActive: boolean;
  order: number;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY TECH SKILL REPOSITORY — implements TechSkillRepositoryPort
// ═══════════════════════════════════════════════════════════════

export class InMemoryTechSkillRepository extends TechSkillRepositoryPort {
  private skills: TechSkillData[] = [];

  async findAllActive(): Promise<TechSkill[]> {
    return this.skills
      .filter((s) => s.isActive)
      .sort((a, b) => b.popularity - a.popularity)
      .map((s) => this.toTechSkill(s));
  }

  async findByNiche(nicheSlug: string): Promise<TechSkill[]> {
    return this.skills
      .filter((s) => s.isActive && s.niche?.slug === nicheSlug)
      .sort((a, b) => b.popularity - a.popularity)
      .map((s) => this.toTechSkill(s));
  }

  async findByType(type: SkillType, limit: number): Promise<TechSkill[]> {
    return this.skills
      .filter((s) => s.isActive && s.type === type)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
      .map((s) => this.toTechSkill(s));
  }

  async searchSkills(query: string, limit: number): Promise<TechSkill[]> {
    const q = query.toLowerCase();
    return this.skills
      .filter(
        (s) =>
          s.isActive &&
          (s.nameEn.toLowerCase().includes(q) ||
            s.namePtBr.toLowerCase().includes(q) ||
            s.slug.toLowerCase().includes(q) ||
            s.aliases.some((a) => a.toLowerCase().includes(q))),
      )
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
      .map((s) => this.toTechSkill(s));
  }

  private toTechSkill(data: TechSkillData): TechSkill {
    return {
      id: data.id,
      slug: data.slug,
      nameEn: data.nameEn,
      namePtBr: data.namePtBr,
      type: data.type,
      icon: data.icon,
      color: data.color,
      website: data.website,
      aliases: data.aliases,
      popularity: data.popularity,
      niche: data.niche,
    };
  }

  // Test helpers
  seed(skills: TechSkillData[]): void {
    this.skills = [...skills];
  }

  add(skill: TechSkillData): void {
    this.skills.push(skill);
  }

  clear(): void {
    this.skills = [];
  }

  getAll(): TechSkillData[] {
    return [...this.skills];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY SPOKEN LANGUAGE REPOSITORY — implements SpokenLanguagesRepositoryPort
// ═══════════════════════════════════════════════════════════════

export class InMemorySpokenLanguageRepository extends SpokenLanguagesRepositoryPort {
  private languages: SpokenLanguageData[] = [];

  async findAllActive(): Promise<SpokenLanguage[]> {
    return this.languages
      .filter((l) => l.isActive)
      .sort((a, b) => a.order - b.order)
      .map((l) => this.toSpokenLanguage(l));
  }

  async searchByName(query: string, limit: number): Promise<SpokenLanguage[]> {
    const q = query.toLowerCase();
    return this.languages
      .filter(
        (l) =>
          l.isActive &&
          (l.nameEn.toLowerCase().includes(q) ||
            l.namePtBr.toLowerCase().includes(q) ||
            l.nameEs.toLowerCase().includes(q) ||
            l.nativeName?.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.order - b.order)
      .slice(0, limit)
      .map((l) => this.toSpokenLanguage(l));
  }

  async findByCode(code: string): Promise<SpokenLanguage | null> {
    const language = this.languages.find((l) => l.code === code);
    return language ? this.toSpokenLanguage(language) : null;
  }

  private toSpokenLanguage(data: SpokenLanguageData): SpokenLanguage {
    return {
      code: data.code,
      nameEn: data.nameEn,
      namePtBr: data.namePtBr,
      nameEs: data.nameEs,
      nativeName: data.nativeName,
    };
  }

  // Test helpers
  seed(languages: SpokenLanguageData[]): void {
    this.languages = [...languages];
  }

  add(language: SpokenLanguageData): void {
    this.languages.push(language);
  }

  clear(): void {
    this.languages = [];
  }

  getAll(): SpokenLanguageData[] {
    return [...this.languages];
  }
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY CACHE — implements CachePort
// ═══════════════════════════════════════════════════════════════

export class InMemoryCacheService extends CachePort {
  private cache = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.cache.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T, _ttl?: number): Promise<void> {
    this.cache.set(key, value);
  }

  // Test helpers
  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }

  clearAll(): void {
    this.cache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createTechSkill(overrides: Partial<TechSkillData> = {}): TechSkillData {
  return {
    id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    slug: 'test-skill',
    nameEn: 'Test Skill',
    namePtBr: 'Skill de Teste',
    type: 'FRAMEWORK' as SkillType,
    icon: null,
    color: null,
    website: null,
    aliases: [],
    popularity: 50,
    isActive: true,
    niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
    ...overrides,
  };
}

export function createSpokenLanguage(
  overrides: Partial<SpokenLanguageData> = {},
): SpokenLanguageData {
  return {
    code: 'en',
    nameEn: 'English',
    namePtBr: 'Inglês',
    nameEs: 'Inglés',
    nativeName: 'English',
    isActive: true,
    order: 1,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEST DATA
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_TECH_SKILLS: TechSkillData[] = [
  createTechSkill({
    id: '1',
    slug: 'javascript',
    nameEn: 'JavaScript',
    namePtBr: 'JavaScript',
    type: 'LANGUAGE' as SkillType,
    popularity: 100,
    niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
  }),
  createTechSkill({
    id: '2',
    slug: 'react',
    nameEn: 'React',
    namePtBr: 'React',
    type: 'FRAMEWORK' as SkillType,
    popularity: 95,
    niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
  }),
  createTechSkill({
    id: '3',
    slug: 'nestjs',
    nameEn: 'NestJS',
    namePtBr: 'NestJS',
    type: 'FRAMEWORK' as SkillType,
    icon: 'nestjs.svg',
    color: '#E0234E',
    website: 'https://nestjs.com',
    aliases: ['nest'],
    popularity: 85,
    niche: { slug: 'nodejs', nameEn: 'Node.js', namePtBr: 'Node.js' },
  }),
  createTechSkill({
    id: '4',
    slug: 'nextjs',
    nameEn: 'Next.js',
    namePtBr: 'Next.js',
    type: 'FRAMEWORK' as SkillType,
    icon: 'nextjs.svg',
    color: '#000000',
    website: 'https://nextjs.org',
    aliases: ['next'],
    popularity: 90,
    niche: { slug: 'react', nameEn: 'React', namePtBr: 'React' },
  }),
];

export const DEFAULT_SPOKEN_LANGUAGES: SpokenLanguageData[] = [
  createSpokenLanguage({
    code: 'en',
    nameEn: 'English',
    namePtBr: 'Inglês',
    nameEs: 'Inglés',
    nativeName: 'English',
    order: 1,
  }),
  createSpokenLanguage({
    code: 'pt',
    nameEn: 'Portuguese',
    namePtBr: 'Português',
    nameEs: 'Portugués',
    nativeName: 'Português',
    order: 2,
  }),
  createSpokenLanguage({
    code: 'es',
    nameEn: 'Spanish',
    namePtBr: 'Espanhol',
    nameEs: 'Español',
    nativeName: 'Español',
    order: 3,
  }),
  createSpokenLanguage({
    code: 'fr',
    nameEn: 'French',
    namePtBr: 'Francês',
    nameEs: 'Francés',
    nativeName: 'Français',
    order: 4,
  }),
];
