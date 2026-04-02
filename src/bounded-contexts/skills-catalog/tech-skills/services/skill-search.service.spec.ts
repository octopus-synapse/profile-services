/**
 * SkillSearchService Tests
 *
 * - Retorna skills corretamente
 * - Cache hit/miss behavior
 * - Query normalização
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  DEFAULT_TECH_SKILLS,
  InMemoryCacheService,
  InMemoryTechSkillRepository,
} from '../../testing';
import { SkillSearchService } from './skill-search.service';

describe('SkillSearchService', () => {
  let service: SkillSearchService;
  let techSkillRepo: InMemoryTechSkillRepository;
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    techSkillRepo = new InMemoryTechSkillRepository();
    techSkillRepo.seed(DEFAULT_TECH_SKILLS);
    cacheService = new InMemoryCacheService();
    service = new SkillSearchService(techSkillRepo as never, cacheService as never);
  });

  describe('searchSkills', () => {
    it('should return skills matching query', async () => {
      const result = await service.searchSkills('nest');

      expect(result.length).toBeGreaterThan(0);
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

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include niche information in results', async () => {
      const result = await service.searchSkills('nest');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        niche: expect.objectContaining({
          slug: expect.any(String),
          nameEn: expect.any(String),
        }),
      });
    });

    it('should cache results after first call', async () => {
      const query = 'javascript';

      // First call - cache should be empty
      const initialCacheSize = cacheService.size();

      await service.searchSkills(query);

      // After first call - cache should have one entry
      expect(cacheService.size()).toBe(initialCacheSize + 1);
    });

    it('should return cached results on subsequent calls', async () => {
      const query = 'react';

      // First call
      const result1 = await service.searchSkills(query);
      const cacheSize = cacheService.size();

      // Second call should use cache (size should not increase)
      const result2 = await service.searchSkills(query);

      expect(result1).toEqual(result2);
      expect(cacheService.size()).toBe(cacheSize);
    });

    it('should return all default skills for broad query', async () => {
      const result = await service.searchSkills('j'); // Matches JavaScript

      expect(result.length).toBeGreaterThan(0);
    });

    it('should find skills by alias', async () => {
      // NestJS has alias 'nest'
      const result = await service.searchSkills('nest');

      const nestjsSkill = result.find((s) => s.slug === 'nestjs');
      expect(nestjsSkill).toBeDefined();
    });
  });
});
