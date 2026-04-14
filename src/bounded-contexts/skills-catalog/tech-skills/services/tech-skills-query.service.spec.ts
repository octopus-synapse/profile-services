/**
 * Tech Skills Query Service Tests
 *
 * Tests for the facade that delegates to specialized query services
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ProgrammingLanguage, TechArea, TechNiche, TechSkill } from '../dto';
import type { SkillType, TechAreaType } from '../interfaces';
import { TechSkillsQueryService } from './tech-skills-query.service';

/**
 * Factory functions for creating complete test objects
 */
function createTechArea(overrides: Partial<TechArea> = {}): TechArea {
  return {
    id: 'area-1',
    type: 'DEVELOPMENT' as TechAreaType,
    nameEn: 'Development',
    namePtBr: 'Desenvolvimento',
    descriptionEn: null,
    descriptionPtBr: null,
    icon: null,
    color: null,
    order: 1,
    ...overrides,
  };
}

function createTechNiche(overrides: Partial<TechNiche> = {}): TechNiche {
  return {
    id: 'niche-1',
    slug: 'frontend',
    nameEn: 'Frontend',
    namePtBr: 'Frontend',
    descriptionEn: null,
    descriptionPtBr: null,
    icon: null,
    color: null,
    order: 1,
    areaType: 'DEVELOPMENT' as TechAreaType,
    ...overrides,
  };
}

function createProgrammingLanguage(
  overrides: Partial<ProgrammingLanguage> = {},
): ProgrammingLanguage {
  return {
    id: 'lang-1',
    slug: 'javascript',
    nameEn: 'JavaScript',
    namePtBr: 'JavaScript',
    color: null,
    website: null,
    aliases: [],
    fileExtensions: ['.js'],
    paradigms: [],
    typing: null,
    popularity: 100,
    ...overrides,
  };
}

function createTechSkill(overrides: Partial<TechSkill> = {}): TechSkill {
  return {
    id: 'skill-1',
    slug: 'react',
    nameEn: 'React',
    namePtBr: 'React',
    type: 'FRAMEWORK' as SkillType,
    icon: null,
    color: null,
    website: null,
    aliases: [],
    popularity: 95,
    niche: { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
    ...overrides,
  };
}

describe('TechSkillsQueryService', () => {
  let service: TechSkillsQueryService;
  let mockAreaQuery: {
    getAllAreas: ReturnType<typeof mock>;
  };
  let mockNicheQuery: {
    getAllNiches: ReturnType<typeof mock>;
    getNichesByArea: ReturnType<typeof mock>;
  };
  let mockLanguageQuery: {
    getAllLanguages: ReturnType<typeof mock>;
    searchLanguages: ReturnType<typeof mock>;
  };
  let mockSkillQuery: {
    getAllSkills: ReturnType<typeof mock>;
    getSkillsByNiche: ReturnType<typeof mock>;
    getSkillsByType: ReturnType<typeof mock>;
  };
  let mockSkillSearch: {
    searchSkills: ReturnType<typeof mock>;
  };

  const mockAreas: TechArea[] = [createTechArea()];
  const mockNiches: TechNiche[] = [createTechNiche()];
  const mockLanguages: ProgrammingLanguage[] = [createProgrammingLanguage()];
  const mockSkills: TechSkill[] = [createTechSkill()];

  beforeEach(() => {
    mockAreaQuery = {
      getAllAreas: mock(() => Promise.resolve(mockAreas)),
    };
    mockNicheQuery = {
      getAllNiches: mock(() => Promise.resolve(mockNiches)),
      getNichesByArea: mock(() => Promise.resolve(mockNiches)),
    };
    mockLanguageQuery = {
      getAllLanguages: mock(() => Promise.resolve(mockLanguages)),
      searchLanguages: mock(() => Promise.resolve(mockLanguages)),
    };
    mockSkillQuery = {
      getAllSkills: mock(() => Promise.resolve(mockSkills)),
      getSkillsByNiche: mock(() => Promise.resolve(mockSkills)),
      getSkillsByType: mock(() => Promise.resolve(mockSkills)),
    };
    mockSkillSearch = {
      searchSkills: mock(() => Promise.resolve(mockSkills)),
    };

    service = new TechSkillsQueryService(
      mockAreaQuery,
      mockNicheQuery,
      mockLanguageQuery,
      mockSkillQuery,
      mockSkillSearch,
    );
  });

  describe('getAllAreas', () => {
    it('should delegate to area query service', async () => {
      const result = await service.getAllAreas();

      expect(mockAreaQuery.getAllAreas).toHaveBeenCalled();
      expect(result).toEqual(mockAreas);
    });
  });

  describe('getAllNiches', () => {
    it('should delegate to niche query service', async () => {
      const result = await service.getAllNiches();

      expect(mockNicheQuery.getAllNiches).toHaveBeenCalled();
      expect(result).toEqual(mockNiches);
    });
  });

  describe('getNichesByArea', () => {
    it('should delegate to niche query service with area type', async () => {
      const result = await service.getNichesByArea('DEVELOPMENT');

      expect(mockNicheQuery.getNichesByArea).toHaveBeenCalledWith('DEVELOPMENT');
      expect(result).toEqual(mockNiches);
    });
  });

  describe('getAllLanguages', () => {
    it('should delegate to language query service', async () => {
      const result = await service.getAllLanguages();

      expect(mockLanguageQuery.getAllLanguages).toHaveBeenCalled();
      expect(result).toEqual(mockLanguages);
    });
  });

  describe('searchLanguages', () => {
    it('should delegate to language query service', async () => {
      const result = await service.searchLanguages('java', 10);

      expect(mockLanguageQuery.searchLanguages).toHaveBeenCalledWith('java', 10);
      expect(result).toEqual(mockLanguages);
    });

    it('should use default limit of 20', async () => {
      await service.searchLanguages('python');

      expect(mockLanguageQuery.searchLanguages).toHaveBeenCalledWith('python', 20);
    });
  });

  describe('getAllSkills', () => {
    it('should delegate to skill query service', async () => {
      const result = await service.getAllSkills();

      expect(mockSkillQuery.getAllSkills).toHaveBeenCalled();
      expect(result).toEqual(mockSkills);
    });
  });

  describe('getSkillsByNiche', () => {
    it('should delegate to skill query service', async () => {
      const result = await service.getSkillsByNiche('frontend');

      expect(mockSkillQuery.getSkillsByNiche).toHaveBeenCalledWith('frontend');
      expect(result).toEqual(mockSkills);
    });
  });

  describe('getSkillsByType', () => {
    it('should delegate to skill query service', async () => {
      const result = await service.getSkillsByType('FRAMEWORK', 25);

      expect(mockSkillQuery.getSkillsByType).toHaveBeenCalledWith('FRAMEWORK', 25);
      expect(result).toEqual(mockSkills);
    });

    it('should use default limit of 50', async () => {
      await service.getSkillsByType('LIBRARY');

      expect(mockSkillQuery.getSkillsByType).toHaveBeenCalledWith('LIBRARY', 50);
    });
  });

  describe('searchSkills', () => {
    it('should delegate to skill search service', async () => {
      const result = await service.searchSkills('react', 15);

      expect(mockSkillSearch.searchSkills).toHaveBeenCalledWith('react', 15);
      expect(result).toEqual(mockSkills);
    });

    it('should use default limit of 20', async () => {
      await service.searchSkills('vue');

      expect(mockSkillSearch.searchSkills).toHaveBeenCalledWith('vue', 20);
    });
  });

  describe('searchAll', () => {
    it('should search both languages and skills', async () => {
      const result = await service.searchAll('java', 20);

      expect(mockLanguageQuery.searchLanguages).toHaveBeenCalled();
      expect(mockSkillSearch.searchSkills).toHaveBeenCalled();
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('skills');
    });

    it('should split limit between languages and skills', async () => {
      await service.searchAll('python', 20);

      expect(mockLanguageQuery.searchLanguages).toHaveBeenCalledWith('python', 10);
      expect(mockSkillSearch.searchSkills).toHaveBeenCalledWith('python', 10);
    });

    it('should execute searches in parallel', async () => {
      const startTime = Date.now();
      await service.searchAll('test', 20);
      const endTime = Date.now();

      // Both searches should complete roughly in parallel
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
