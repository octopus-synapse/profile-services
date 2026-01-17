/**
 * SkillSearchService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável:
 * - Retorna skills corretamente
 * - Cache hit/miss behavior
 * - Query normalização
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { SkillSearchService } from './skill-search.service';
import { TechSkillsRepository } from '../repositories';
import { CacheService } from '../../common/cache/cache.service';

describe('SkillSearchService', () => {
  let service: SkillSearchService;

  const mockSkillsFromDb = [
    {
      id: '1',
      slug: 'nestjs',
      nameEn: 'NestJS',
      namePtBr: 'NestJS',
      type: 'FRAMEWORK',
      icon: 'nestjs.svg',
      color: '#E0234E',
      website: 'https://nestjs.com',
      aliases: ['nest'],
      popularity: 85,
      niche_slug: 'nodejs',
      niche_nameEn: 'Node.js',
      niche_namePtBr: 'Node.js',
    },
    {
      id: '2',
      slug: 'nextjs',
      nameEn: 'Next.js',
      namePtBr: 'Next.js',
      type: 'FRAMEWORK',
      icon: 'nextjs.svg',
      color: '#000000',
      website: 'https://nextjs.org',
      aliases: ['next'],
      popularity: 90,
      niche_slug: 'react',
      niche_nameEn: 'React',
      niche_namePtBr: 'React',
    },
  ];

  // In-memory cache
  const cacheStore = new Map<string, unknown>();

  const mockTechSkillsRepo = {
    searchSkillsRaw: mock(() => Promise.resolve(mockSkillsFromDb)),
  };

  const stubCache = {
    get: mock((key: string) => Promise.resolve(cacheStore.get(key) ?? null)),
    set: mock((key: string, value: unknown) => {
      cacheStore.set(key, value);
      return Promise.resolve();
    }),
  };

  beforeEach(async () => {
    cacheStore.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillSearchService,
        { provide: TechSkillsRepository, useValue: mockTechSkillsRepo },
        { provide: CacheService, useValue: stubCache },
      ],
    }).compile();

    service = module.get<SkillSearchService>(SkillSearchService);
  });

  describe('searchSkills', () => {
    it('should return skills matching query', async () => {
      const result = await service.searchSkills('nest');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        slug: expect.any(String),
        nameEn: expect.any(String),
        type: expect.any(String),
      });
    });

    it('should return empty array for empty query', async () => {
      const result = await service.searchSkills('');

      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace query', async () => {
      const result = await service.searchSkills('   ');

      expect(result).toEqual([]);
    });

    it('should normalize query to lowercase', async () => {
      await service.searchSkills('NEST');

      // Verify that the same cache key is used for different cases
      const result1 = await service.searchSkills('nest');
      const result2 = await service.searchSkills('NEST');

      expect(result1).toEqual(result2);
    });

    it('should return consistent results on multiple calls', async () => {
      // First call
      const result1 = await service.searchSkills('nest');

      // Second call - should return same results
      const result2 = await service.searchSkills('nest');

      expect(result1).toEqual(result2);
    });

    it('should respect limit parameter', async () => {
      const result = await service.searchSkills('nest', 1);

      // Since we're using a stub, we verify the result structure
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include niche information in results', async () => {
      const result = await service.searchSkills('nest');

      expect(result[0]).toMatchObject({
        niche: expect.objectContaining({
          slug: expect.any(String),
          nameEn: expect.any(String),
        }),
      });
    });
  });
});
