/**
 * Tech Skills Query Composition Tests
 *
 * Tests that the composition correctly delegates to specialized use cases
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ProgrammingLanguage, TechArea, TechNiche, TechSkill } from '../dto';
import type { SkillType, TechAreaType } from '../interfaces';
import type { TechSkillsUseCases } from './ports/tech-skills.port';

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

function createTechSkillObj(overrides: Partial<TechSkill> = {}): TechSkill {
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

describe('TechSkillsUseCases (composition)', () => {
  let useCases: TechSkillsUseCases;

  const mockAreas: TechArea[] = [createTechArea()];
  const mockNiches: TechNiche[] = [createTechNiche()];
  const mockLanguages: ProgrammingLanguage[] = [createProgrammingLanguage()];
  const mockSkills: TechSkill[] = [createTechSkillObj()];

  beforeEach(() => {
    useCases = {
      getAllAreasUseCase: { execute: mock(() => Promise.resolve(mockAreas)) },
      getAllNichesUseCase: { execute: mock(() => Promise.resolve(mockNiches)) },
      getNichesByAreaUseCase: { execute: mock(() => Promise.resolve(mockNiches)) },
      getAllLanguagesUseCase: { execute: mock(() => Promise.resolve(mockLanguages)) },
      searchLanguagesUseCase: { execute: mock(() => Promise.resolve(mockLanguages)) },
      getAllSkillsUseCase: { execute: mock(() => Promise.resolve(mockSkills)) },
      getSkillsByNicheUseCase: { execute: mock(() => Promise.resolve(mockSkills)) },
      getSkillsByTypeUseCase: { execute: mock(() => Promise.resolve(mockSkills)) },
      searchSkillsUseCase: { execute: mock(() => Promise.resolve(mockSkills)) },
      searchAllUseCase: {
        execute: mock(() => Promise.resolve({ languages: mockLanguages, skills: mockSkills })),
      },
    };
  });

  describe('getAllAreas', () => {
    it('should delegate to getAllAreasUseCase', async () => {
      const result = await useCases.getAllAreasUseCase.execute();

      expect(useCases.getAllAreasUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual(mockAreas);
    });
  });

  describe('getAllNiches', () => {
    it('should delegate to getAllNichesUseCase', async () => {
      const result = await useCases.getAllNichesUseCase.execute();

      expect(useCases.getAllNichesUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual(mockNiches);
    });
  });

  describe('getNichesByArea', () => {
    it('should delegate to getNichesByAreaUseCase with area type', async () => {
      const result = await useCases.getNichesByAreaUseCase.execute('DEVELOPMENT');

      expect(useCases.getNichesByAreaUseCase.execute).toHaveBeenCalledWith('DEVELOPMENT');
      expect(result).toEqual(mockNiches);
    });
  });

  describe('getAllLanguages', () => {
    it('should delegate to getAllLanguagesUseCase', async () => {
      const result = await useCases.getAllLanguagesUseCase.execute();

      expect(useCases.getAllLanguagesUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual(mockLanguages);
    });
  });

  describe('searchLanguages', () => {
    it('should delegate to searchLanguagesUseCase', async () => {
      const result = await useCases.searchLanguagesUseCase.execute('java', 10);

      expect(useCases.searchLanguagesUseCase.execute).toHaveBeenCalledWith('java', 10);
      expect(result).toEqual(mockLanguages);
    });
  });

  describe('getAllSkills', () => {
    it('should delegate to getAllSkillsUseCase', async () => {
      const result = await useCases.getAllSkillsUseCase.execute();

      expect(useCases.getAllSkillsUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual(mockSkills);
    });
  });

  describe('getSkillsByNiche', () => {
    it('should delegate to getSkillsByNicheUseCase', async () => {
      const result = await useCases.getSkillsByNicheUseCase.execute('frontend');

      expect(useCases.getSkillsByNicheUseCase.execute).toHaveBeenCalledWith('frontend');
      expect(result).toEqual(mockSkills);
    });
  });

  describe('getSkillsByType', () => {
    it('should delegate to getSkillsByTypeUseCase', async () => {
      const result = await useCases.getSkillsByTypeUseCase.execute('FRAMEWORK', 25);

      expect(useCases.getSkillsByTypeUseCase.execute).toHaveBeenCalledWith('FRAMEWORK', 25);
      expect(result).toEqual(mockSkills);
    });
  });

  describe('searchSkills', () => {
    it('should delegate to searchSkillsUseCase', async () => {
      const result = await useCases.searchSkillsUseCase.execute('react', 15);

      expect(useCases.searchSkillsUseCase.execute).toHaveBeenCalledWith('react', 15);
      expect(result).toEqual(mockSkills);
    });
  });

  describe('searchAll', () => {
    it('should search both languages and skills', async () => {
      const result = await useCases.searchAllUseCase.execute('java', 20);

      expect(useCases.searchAllUseCase.execute).toHaveBeenCalled();
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('skills');
    });
  });
});
