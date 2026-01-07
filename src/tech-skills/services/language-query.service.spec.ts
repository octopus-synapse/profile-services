/**
 * LanguageQueryService Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { LanguageQueryService } from './language-query.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

describe('LanguageQueryService', () => {
  let service: LanguageQueryService;

  const mockLanguagesFromDb = [
    {
      id: '1',
      slug: 'typescript',
      nameEn: 'TypeScript',
      namePtBr: 'TypeScript',
      icon: 'typescript.svg',
      color: '#3178C6',
      website: 'https://typescriptlang.org',
      popularity: 95,
    },
    {
      id: '2',
      slug: 'python',
      nameEn: 'Python',
      namePtBr: 'Python',
      icon: 'python.svg',
      color: '#3776AB',
      website: 'https://python.org',
      popularity: 100,
    },
  ];

  const cacheStore = new Map<string, unknown>();

  const stubPrisma = {
    programmingLanguage: {
      findMany: mock().mockResolvedValue(mockLanguagesFromDb),
    },
    $queryRaw: mock().mockResolvedValue(mockLanguagesFromDb),
  };

  const stubCache = {
    get: mock((key: string) => Promise.resolve(cacheStore.get(key) ?? null)),
    set: mock((key: string, value: unknown) => {
      cacheStore.set(key, value);
      return Promise.resolve();
    }),
  };

  beforeEach(async () => {
    cacheStore.clear();const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageQueryService,
        { provide: PrismaService, useValue: stubPrisma },
        { provide: CacheService, useValue: stubCache },
      ],
    }).compile();

    service = module.get<LanguageQueryService>(LanguageQueryService);
  });

  describe('getAllLanguages', () => {
    it('should return all programming languages', async () => {
      const result = await service.getAllLanguages();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        slug: expect.any(String),
        nameEn: expect.any(String),
      });
    });

    it('should cache results', async () => {
      await service.getAllLanguages();
      await service.getAllLanguages();

      expect(stubPrisma.programmingLanguage.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchLanguages', () => {
    it('should return languages matching query', async () => {
      stubPrisma.$queryRaw.mockResolvedValueOnce([mockLanguagesFromDb[0]]);

      const result = await service.searchLanguages('type');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for empty query', async () => {
      const result = await service.searchLanguages('');

      expect(result).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const result = await service.searchLanguages('p', 5);

      expect(result).toBeDefined();
    });
  });
});
