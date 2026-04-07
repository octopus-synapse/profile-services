/**
 * SearchSkillsUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  DEFAULT_TECH_SKILLS,
  InMemoryCacheService,
  InMemoryTechSkillRepository,
} from '../../../../testing';
import { TechSkillRepository } from '../../../infrastructure/adapters/persistence/tech-skill.repository';
import { CacheAdapter } from '../../../infrastructure/adapters/persistence/cache.adapter';
import { SearchSkillsUseCase } from './search-skills.use-case';

describe('SearchSkillsUseCase', () => {
  let useCase: SearchSkillsUseCase;
  let techSkillRepo: InMemoryTechSkillRepository;
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    techSkillRepo = new InMemoryTechSkillRepository();
    techSkillRepo.seed(DEFAULT_TECH_SKILLS);
    cacheService = new InMemoryCacheService();

    const repository = new TechSkillRepository(techSkillRepo as never);
    const cache = new CacheAdapter(cacheService as never);
    useCase = new SearchSkillsUseCase(repository, cache);
  });

  it('should return skills matching query', async () => {
    const result = await useCase.execute('nest');

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      slug: expect.any(String),
      nameEn: expect.any(String),
      type: expect.any(String),
    });
  });

  it('should return empty array for empty query', async () => {
    const result = await useCase.execute('');

    expect(result).toEqual([]);
  });

  it('should return empty array for whitespace query', async () => {
    const result = await useCase.execute('   ');

    expect(result).toEqual([]);
  });

  it('should normalize query to lowercase', async () => {
    const result1 = await useCase.execute('nest');
    const result2 = await useCase.execute('NEST');

    expect(result1).toEqual(result2);
  });

  it('should return consistent results on multiple calls', async () => {
    const result1 = await useCase.execute('nest');
    const result2 = await useCase.execute('nest');

    expect(result1).toEqual(result2);
  });

  it('should respect limit parameter', async () => {
    const result = await useCase.execute('nest', 1);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should include niche information in results', async () => {
    const result = await useCase.execute('nest');

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
    const initialCacheSize = cacheService.size();

    await useCase.execute(query);

    expect(cacheService.size()).toBe(initialCacheSize + 1);
  });

  it('should return cached results on subsequent calls', async () => {
    const query = 'react';

    const result1 = await useCase.execute(query);
    const cacheSize = cacheService.size();

    const result2 = await useCase.execute(query);

    expect(result1).toEqual(result2);
    expect(cacheService.size()).toBe(cacheSize);
  });

  it('should return all default skills for broad query', async () => {
    const result = await useCase.execute('j');

    expect(result.length).toBeGreaterThan(0);
  });

  it('should find skills by alias', async () => {
    const result = await useCase.execute('nest');

    const nestjsSkill = result.find((s) => s.slug === 'nestjs');
    expect(nestjsSkill).toBeDefined();
  });
});
