/**
 * TechSkillsQueryService Tests (Facade)
 *
 * NOTA (Uncle Bob): Facade puro que delega para services especializados.
 * Testes verificam comportamento (outputs), não implementação.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TechSkillsQueryService } from './tech-skills-query.service';
import { TechAreaQueryService } from './area-query.service';
import { TechNicheQueryService } from './niche-query.service';
import { LanguageQueryService } from './language-query.service';
import { SkillQueryService } from './skill-query.service';
import { SkillSearchService } from './skill-search.service';

describe('TechSkillsQueryService (Facade)', () => {
  let service: TechSkillsQueryService;

  const mockAreas = [
    { id: '1', slug: 'backend', nameEn: 'Backend', namePtBr: 'Backend' },
    { id: '2', slug: 'frontend', nameEn: 'Frontend', namePtBr: 'Frontend' },
  ];

  const mockNiches = [
    { id: '1', slug: 'nodejs', nameEn: 'Node.js', namePtBr: 'Node.js' },
    { id: '2', slug: 'react', nameEn: 'React', namePtBr: 'React' },
  ];

  const mockLanguages = [
    { id: '1', slug: 'typescript', nameEn: 'TypeScript', popularity: 100 },
    { id: '2', slug: 'python', nameEn: 'Python', popularity: 95 },
  ];

  const mockSkills = [
    { id: '1', slug: 'nestjs', nameEn: 'NestJS', type: 'FRAMEWORK' },
    { id: '2', slug: 'docker', nameEn: 'Docker', type: 'TOOL' },
  ];

  const stubAreaQuery = {
    getAllAreas: jest.fn().mockResolvedValue(mockAreas),
  };

  const stubNicheQuery = {
    getAllNiches: jest.fn().mockResolvedValue(mockNiches),
    getNichesByArea: jest.fn().mockResolvedValue([mockNiches[0]]),
  };

  const stubLanguageQuery = {
    getAllLanguages: jest.fn().mockResolvedValue(mockLanguages),
    searchLanguages: jest.fn().mockResolvedValue([mockLanguages[0]]),
  };

  const stubSkillQuery = {
    getAllSkills: jest.fn().mockResolvedValue(mockSkills),
    getSkillsByNiche: jest.fn().mockResolvedValue([mockSkills[0]]),
    getSkillsByType: jest.fn().mockResolvedValue([mockSkills[1]]),
  };

  const stubSkillSearch = {
    searchSkills: jest.fn().mockResolvedValue([mockSkills[0]]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechSkillsQueryService,
        { provide: TechAreaQueryService, useValue: stubAreaQuery },
        { provide: TechNicheQueryService, useValue: stubNicheQuery },
        { provide: LanguageQueryService, useValue: stubLanguageQuery },
        { provide: SkillQueryService, useValue: stubSkillQuery },
        { provide: SkillSearchService, useValue: stubSkillSearch },
      ],
    }).compile();

    service = module.get<TechSkillsQueryService>(TechSkillsQueryService);
  });

  describe('getAllAreas', () => {
    it('should return list of tech areas', async () => {
      const result = await service.getAllAreas();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        slug: 'backend',
        nameEn: 'Backend',
      });
    });
  });

  describe('getAllNiches', () => {
    it('should return list of tech niches', async () => {
      const result = await service.getAllNiches();

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ slug: 'nodejs' }),
          expect.objectContaining({ slug: 'react' }),
        ]),
      );
    });
  });

  describe('getNichesByArea', () => {
    it('should return niches filtered by area', async () => {
      const result = await service.getNichesByArea('DEVELOPMENT');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('nodejs');
    });
  });

  describe('getAllLanguages', () => {
    it('should return list of programming languages', async () => {
      const result = await service.getAllLanguages();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        slug: 'typescript',
        nameEn: 'TypeScript',
      });
    });
  });

  describe('searchLanguages', () => {
    it('should return languages matching query', async () => {
      const result = await service.searchLanguages('type');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('typescript');
    });
  });

  describe('getAllSkills', () => {
    it('should return list of tech skills', async () => {
      const result = await service.getAllSkills();

      expect(result).toHaveLength(2);
    });
  });

  describe('getSkillsByNiche', () => {
    it('should return skills for specific niche', async () => {
      const result = await service.getSkillsByNiche('nodejs');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('nestjs');
    });
  });

  describe('getSkillsByType', () => {
    it('should return skills of specific type', async () => {
      const result = await service.getSkillsByType('TOOL');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('docker');
    });
  });

  describe('searchSkills', () => {
    it('should return skills matching query', async () => {
      const result = await service.searchSkills('nest');

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('nestjs');
    });
  });

  describe('searchAll', () => {
    it('should return combined results of languages and skills', async () => {
      const result = await service.searchAll('type');

      expect(result).toMatchObject({
        languages: expect.any(Array),
        skills: expect.any(Array),
      });
      expect(result.languages).toHaveLength(1);
      expect(result.skills).toHaveLength(1);
    });
  });
});
