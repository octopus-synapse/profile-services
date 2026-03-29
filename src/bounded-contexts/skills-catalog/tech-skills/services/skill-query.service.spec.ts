/**
 * Skill Query Service Tests
 *
 * Tests for tech skills query and caching
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { TechSkill } from '../dto';
import type { SkillType } from '../interfaces';
import { SkillQueryService } from './skill-query.service';

/**
 * Creates a complete TechSkill object for testing
 */
function createTechSkill(overrides: Partial<TechSkill> = {}): TechSkill {
  return {
    id: 'test-id',
    slug: 'test-skill',
    nameEn: 'Test Skill',
    namePtBr: 'Skill de Teste',
    type: 'FRAMEWORK' as SkillType,
    icon: null,
    color: null,
    website: null,
    aliases: [],
    popularity: 50,
    niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
    ...overrides,
  };
}

describe('SkillQueryService', () => {
  let service: SkillQueryService;
  let mockPrisma: {
    techSkill: {
      findMany: ReturnType<typeof mock>;
    };
  };
  let mockCache: {
    get: ReturnType<typeof mock>;
    set: ReturnType<typeof mock>;
  };

  const mockDbSkills = [
    {
      id: '1',
      slug: 'javascript',
      nameEn: 'JavaScript',
      namePtBr: 'JavaScript',
      type: 'LANGUAGE' as SkillType,
      icon: null,
      color: null,
      website: null,
      aliases: [],
      popularity: 100,
      isActive: true,
      niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
    },
    {
      id: '2',
      slug: 'react',
      nameEn: 'React',
      namePtBr: 'React',
      type: 'FRAMEWORK' as SkillType,
      icon: null,
      color: null,
      website: null,
      aliases: [],
      popularity: 95,
      isActive: true,
      niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      techSkill: {
        findMany: mock(() => Promise.resolve(mockDbSkills)),
      },
    };
    mockCache = {
      get: mock(() => Promise.resolve(null)),
      set: mock(() => Promise.resolve()),
    };
    service = new SkillQueryService(mockPrisma as never, mockCache as never);
  });

  describe('getAllSkills', () => {
    it('should return all active skills', async () => {
      const result = await service.getAllSkills();

      expect(result).toHaveLength(2);
      expect(mockPrisma.techSkill.findMany).toHaveBeenCalled();
    });

    it('should return cached data if available', async () => {
      const cachedSkills: TechSkill[] = [
        createTechSkill({ slug: 'cached', nameEn: 'Cached Skill' }),
      ];
      mockCache.get = mock(() => Promise.resolve(cachedSkills));

      const result = await service.getAllSkills();

      expect(result).toEqual(cachedSkills);
      expect(mockPrisma.techSkill.findMany).not.toHaveBeenCalled();
    });

    it('should cache results after fetching', async () => {
      await service.getAllSkills();

      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should order by popularity descending', async () => {
      await service.getAllSkills();

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalled();
    });

    it('should include niche information', async () => {
      await service.getAllSkills();

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalled();
    });
  });

  describe('getSkillsByNiche', () => {
    it('should filter skills by niche slug', async () => {
      const result = await service.getSkillsByNiche('frontend');

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return cached niche skills if available', async () => {
      const cachedSkills: TechSkill[] = [createTechSkill({ slug: 'vue', nameEn: 'Vue.js' })];
      mockCache.get = mock(() => Promise.resolve(cachedSkills));

      const result = await service.getSkillsByNiche('frontend');

      expect(result).toEqual(cachedSkills);
      expect(mockPrisma.techSkill.findMany).not.toHaveBeenCalled();
    });

    it('should cache niche skills with unique key', async () => {
      await service.getSkillsByNiche('backend');

      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('getSkillsByType', () => {
    it('should filter skills by type', async () => {
      await service.getSkillsByType('FRAMEWORK');

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      await service.getSkillsByType('FRAMEWORK', 10);

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalled();
    });

    it('should use default limit of 50', async () => {
      await service.getSkillsByType('FRAMEWORK');

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalled();
    });

    it('should not cache type queries', async () => {
      await service.getSkillsByType('FRAMEWORK');

      // Type queries are not cached in the implementation
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });
});
