/**
 * Skills Catalog Testing Module
 *
 * In-memory implementations for testing skills catalog functionality.
 */

import type { SkillType } from '../tech-skills/interfaces';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TechSkillData {
  id: string;
  slug: string;
  nameEn: string;
  namePtBr: string;
  type: SkillType;
  icon: string | null;
  color: string | null;
  website: string | null;
  aliases: string[];
  popularity: number;
  isActive: boolean;
  niche: {
    slug: string;
    nameEn: string;
    namePtBr: string;
  };
}

export interface SpokenLanguageData {
  code: string;
  nameEn: string;
  namePtBr: string;
  nameEs: string;
  nativeName: string | null;
  isActive: boolean;
  order: number;
}

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY TECH SKILL REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemoryTechSkillRepository {
  private skills: TechSkillData[] = [];

  // Prisma-like interface
  readonly techSkill = {
    findMany: async (args?: {
      where?: { isActive?: boolean; type?: SkillType; niche?: { slug?: string } };
      orderBy?: { popularity?: 'asc' | 'desc' };
      include?: { niche?: boolean };
      take?: number;
    }) => {
      let result = [...this.skills];

      if (args?.where?.isActive !== undefined) {
        result = result.filter((s) => s.isActive === args.where?.isActive);
      }

      if (args?.where?.type) {
        result = result.filter((s) => s.type === args.where?.type);
      }

      if (args?.where?.niche?.slug) {
        result = result.filter((s) => s.niche.slug === args.where?.niche?.slug);
      }

      if (args?.orderBy?.popularity) {
        result.sort((a, b) =>
          args.orderBy?.popularity === 'desc'
            ? b.popularity - a.popularity
            : a.popularity - b.popularity,
        );
      }

      if (args?.take) {
        result = result.slice(0, args.take);
      }

      return result;
    },

    findUnique: async (args: { where: { slug: string } }) => {
      return this.skills.find((s) => s.slug === args.where.slug) ?? null;
    },
  };

  // Raw query support for search
  async $queryRaw<T = unknown>(): Promise<T> {
    // Transform to raw query format
    return this.skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      nameEn: s.nameEn,
      namePtBr: s.namePtBr,
      type: s.type,
      icon: s.icon,
      color: s.color,
      website: s.website,
      aliases: s.aliases,
      popularity: s.popularity,
      niche_slug: s.niche.slug,
      niche_nameEn: s.niche.nameEn,
      niche_namePtBr: s.niche.namePtBr,
    })) as T;
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
// IN-MEMORY SPOKEN LANGUAGE REPOSITORY
// ═══════════════════════════════════════════════════════════════

export class InMemorySpokenLanguageRepository {
  private languages: SpokenLanguageData[] = [];

  // Prisma-like interface
  readonly spokenLanguage = {
    findMany: async (args?: {
      where?: {
        isActive?: boolean;
        OR?: Array<{
          nameEn?: { contains: string; mode: string };
          namePtBr?: { contains: string; mode: string };
          nameEs?: { contains: string; mode: string };
          nativeName?: { contains: string; mode: string };
        }>;
      };
      orderBy?: { order?: 'asc' | 'desc' };
      select?: Record<string, boolean>;
      take?: number;
    }) => {
      let result = [...this.languages];

      if (args?.where?.isActive !== undefined) {
        result = result.filter((l) => l.isActive === args.where?.isActive);
      }

      if (args?.where?.OR) {
        const orConditions = args.where.OR;
        result = result.filter((l) =>
          orConditions.some((condition) => {
            if (condition.nameEn?.contains) {
              return l.nameEn.toLowerCase().includes(condition.nameEn.contains.toLowerCase());
            }
            if (condition.namePtBr?.contains) {
              return l.namePtBr.toLowerCase().includes(condition.namePtBr.contains.toLowerCase());
            }
            if (condition.nameEs?.contains) {
              return l.nameEs.toLowerCase().includes(condition.nameEs.contains.toLowerCase());
            }
            if (condition.nativeName?.contains && l.nativeName) {
              return l.nativeName
                .toLowerCase()
                .includes(condition.nativeName.contains.toLowerCase());
            }
            return false;
          }),
        );
      }

      if (args?.orderBy?.order) {
        result.sort((a, b) =>
          args.orderBy?.order === 'asc' ? a.order - b.order : b.order - a.order,
        );
      }

      if (args?.take) {
        result = result.slice(0, args.take);
      }

      // Apply select if provided
      const selectClause = args?.select;
      if (selectClause) {
        return result.map((l) => {
          const selected: Record<string, unknown> = {};
          for (const key of Object.keys(selectClause)) {
            if (selectClause[key] && key in l) {
              selected[key] = l[key as keyof SpokenLanguageData];
            }
          }
          return selected as unknown as SpokenLanguageData;
        });
      }

      return result;
    },

    findUnique: async (args: { where: { code: string }; select?: Record<string, boolean> }) => {
      const language = this.languages.find((l) => l.code === args.where.code);
      if (!language) return null;

      if (args.select) {
        const selectClause = args.select;
        const selected: Record<string, unknown> = {};
        for (const key of Object.keys(selectClause)) {
          if (selectClause[key] && key in language) {
            selected[key] = language[key as keyof SpokenLanguageData];
          }
        }
        return selected as unknown as SpokenLanguageData;
      }

      return language;
    },
  };

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
// IN-MEMORY CACHE SERVICE
// ═══════════════════════════════════════════════════════════════

export class InMemoryCacheService {
  private cache = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.cache.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T, _ttl?: number): Promise<void> {
    this.cache.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Test helpers
  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
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
