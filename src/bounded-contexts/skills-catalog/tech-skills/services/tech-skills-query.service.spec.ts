/**
 * Tech Skills Query Service Tests
 *
 * Tests for the facade that delegates to specialized query services
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TechSkillsQueryService } from './tech-skills-query.service';

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

  const mockAreas = [
    { slug: 'development', nameEn: 'Development', namePtBr: 'Desenvolvimento' },
  ];
  const mockNiches = [
    { slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
  ];
  const mockLanguages = [
    { slug: 'javascript', name: 'JavaScript', popularity: 100 },
  ];
  const mockSkills = [{ slug: 'react', name: 'React', type: 'framework' }];

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
      mockAreaQuery as never,
      mockNicheQuery as never,
      mockLanguageQuery as never,
      mockSkillQuery as never,
      mockSkillSearch as never,
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
      const result = await service.getNichesByArea('development');

      expect(mockNicheQuery.getNichesByArea).toHaveBeenCalledWith(
        'development',
      );
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

      expect(mockLanguageQuery.searchLanguages).toHaveBeenCalledWith(
        'java',
        10,
      );
      expect(result).toEqual(mockLanguages);
    });

    it('should use default limit of 20', async () => {
      await service.searchLanguages('python');

      expect(mockLanguageQuery.searchLanguages).toHaveBeenCalledWith(
        'python',
        20,
      );
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
      const result = await service.getSkillsByType('framework', 25);

      expect(mockSkillQuery.getSkillsByType).toHaveBeenCalledWith(
        'framework',
        25,
      );
      expect(result).toEqual(mockSkills);
    });

    it('should use default limit of 50', async () => {
      await service.getSkillsByType('library');

      expect(mockSkillQuery.getSkillsByType).toHaveBeenCalledWith(
        'library',
        50,
      );
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

      expect(mockLanguageQuery.searchLanguages).toHaveBeenCalledWith(
        'python',
        10,
      );
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
