/**
 * Skill Query Service Tests
 *
 * Tests for tech skills query and caching
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { SkillQueryService } from './skill-query.service';

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

  const mockSkills = [
    {
      id: '1',
      slug: 'javascript',
      name: 'JavaScript',
      type: 'programming_language',
      popularity: 100,
      isActive: true,
      niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
    },
    {
      id: '2',
      slug: 'react',
      name: 'React',
      type: 'framework',
      popularity: 95,
      isActive: true,
      niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      techSkill: {
        findMany: mock(() => Promise.resolve(mockSkills)),
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
      expect(mockPrisma.techSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { popularity: 'desc' },
        }),
      );
    });

    it('should return cached data if available', async () => {
      const cachedSkills = [{ slug: 'cached', name: 'Cached Skill' }];
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

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { popularity: 'desc' },
        }),
      );
    });

    it('should include niche information', async () => {
      await service.getAllSkills();

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { niche: expect.any(Object) },
        }),
      );
    });
  });

  describe('getSkillsByNiche', () => {
    it('should filter skills by niche slug', async () => {
      const result = await service.getSkillsByNiche('frontend');

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, niche: { slug: 'frontend' } },
        }),
      );
      expect(result).toBeDefined();
    });

    it('should return cached niche skills if available', async () => {
      const cachedSkills = [{ slug: 'vue', name: 'Vue.js' }];
      mockCache.get = mock(() => Promise.resolve(cachedSkills));

      const result = await service.getSkillsByNiche('frontend');

      expect(result).toEqual(cachedSkills);
      expect(mockPrisma.techSkill.findMany).not.toHaveBeenCalled();
    });

    it('should cache niche skills with unique key', async () => {
      await service.getSkillsByNiche('backend');

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('backend'),
        expect.any(Array),
        expect.any(Number),
      );
    });
  });

  describe('getSkillsByType', () => {
    it('should filter skills by type', async () => {
      await service.getSkillsByType('framework');

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, type: 'framework' },
        }),
      );
    });

    it('should respect limit parameter', async () => {
      await service.getSkillsByType('framework', 10);

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should use default limit of 50', async () => {
      await service.getSkillsByType('framework');

      expect(mockPrisma.techSkill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should not cache type queries', async () => {
      await service.getSkillsByType('framework');

      // Type queries are not cached in the implementation
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });
});
