/**
 * CourseQueryService Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CourseQueryService } from './course-query.service';
import { CourseRepository } from '../repositories';
import { CacheService } from '../../common/cache/cache.service';

describe('CourseQueryService', () => {
  let service: CourseQueryService;

  const mockCourses = [
    {
      id: '1',
      codigoCurso: 101,
      nome: 'Engenharia de Software',
      grau: 'Bacharelado',
      modalidade: 'Presencial',
      areaConhecimento: 'Computação',
      codigoIes: 1001,
    },
    {
      id: '2',
      codigoCurso: 102,
      nome: 'Ciência da Computação',
      grau: 'Bacharelado',
      modalidade: 'Presencial',
      areaConhecimento: 'Computação',
      codigoIes: 1001,
    },
  ];

  const cacheStore = new Map<string, unknown>();

  const stubRepository = {
    findByInstitution: jest.fn().mockResolvedValue(mockCourses),
    findByCode: jest.fn().mockImplementation((code: number) => {
      return Promise.resolve(
        mockCourses.find((c) => c.codigoCurso === code) ?? null,
      );
    }),
    search: jest.fn().mockResolvedValue([mockCourses[0]]),
    getDistinctAreas: jest
      .fn()
      .mockResolvedValue(['Computação', 'Engenharia', 'Saúde']),
  };

  const stubCache = {
    get: jest.fn((key: string) => Promise.resolve(cacheStore.get(key) ?? null)),
    set: jest.fn((key: string, value: unknown) => {
      cacheStore.set(key, value);
      return Promise.resolve();
    }),
  };

  beforeEach(async () => {
    cacheStore.clear();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseQueryService,
        { provide: CourseRepository, useValue: stubRepository },
        { provide: CacheService, useValue: stubCache },
      ],
    }).compile();

    service = module.get<CourseQueryService>(CourseQueryService);
  });

  describe('listByInstitution', () => {
    it('should return courses for institution', async () => {
      const result = await service.listByInstitution(1001);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        nome: 'Engenharia de Software',
        grau: 'Bacharelado',
      });
    });

    it('should cache results per institution', async () => {
      await service.listByInstitution(1001);
      await service.listByInstitution(1001);

      expect(stubRepository.findByInstitution).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByCode', () => {
    it('should return course when found', async () => {
      const result = await service.getByCode(101);

      expect(result).toMatchObject({
        codigoCurso: 101,
        nome: 'Engenharia de Software',
      });
    });

    it('should return null when course not found', async () => {
      stubRepository.findByCode.mockResolvedValueOnce(null);

      const result = await service.getByCode(9999);

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should return matching courses', async () => {
      const result = await service.search('Engenharia');

      expect(result).toHaveLength(1);
      expect(result[0].nome).toContain('Engenharia');
    });

    it('should return empty array for short queries', async () => {
      const result = await service.search('E');

      expect(result).toEqual([]);
    });

    it('should cache search results', async () => {
      await service.search('engenharia');
      await service.search('engenharia');

      expect(stubRepository.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('getKnowledgeAreas', () => {
    it('should return list of knowledge areas', async () => {
      const result = await service.getKnowledgeAreas();

      expect(result).toEqual(['Computação', 'Engenharia', 'Saúde']);
    });
  });
});
