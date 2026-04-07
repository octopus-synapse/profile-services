/**
 * GetAllSkillsUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  createTechSkill,
  DEFAULT_TECH_SKILLS,
  InMemoryCacheService,
  InMemoryTechSkillRepository,
} from '../../../../testing';
import type { TechSkill } from '../../../dto';
import { TECH_SKILLS_CACHE_KEYS } from '../../../interfaces';
import { TechSkillRepository } from '../../../infrastructure/adapters/persistence/tech-skill.repository';
import { CacheAdapter } from '../../../infrastructure/adapters/persistence/cache.adapter';
import { GetAllSkillsUseCase } from './get-all-skills.use-case';

describe('GetAllSkillsUseCase', () => {
  let useCase: GetAllSkillsUseCase;
  let techSkillRepo: InMemoryTechSkillRepository;
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    techSkillRepo = new InMemoryTechSkillRepository();
    techSkillRepo.seed(DEFAULT_TECH_SKILLS);
    cacheService = new InMemoryCacheService();

    const repository = new TechSkillRepository(techSkillRepo as never);
    const cache = new CacheAdapter(cacheService as never);
    useCase = new GetAllSkillsUseCase(repository, cache);
  });

  it('should return all active skills', async () => {
    const result = await useCase.execute();

    expect(result.length).toBeGreaterThan(0);
  });

  it('should return cached data if available', async () => {
    const cachedSkills: TechSkill[] = [
      createTechSkill({ slug: 'cached', nameEn: 'Cached Skill' }) as TechSkill,
    ];
    await cacheService.set(TECH_SKILLS_CACHE_KEYS.SKILLS_LIST, cachedSkills);

    const result = await useCase.execute();

    expect(result).toEqual(cachedSkills);
  });

  it('should cache results after fetching', async () => {
    expect(cacheService.has(TECH_SKILLS_CACHE_KEYS.SKILLS_LIST)).toBe(false);

    await useCase.execute();

    expect(cacheService.has(TECH_SKILLS_CACHE_KEYS.SKILLS_LIST)).toBe(true);
  });

  it('should order by popularity descending', async () => {
    const result = await useCase.execute();

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].popularity).toBeGreaterThanOrEqual(result[i].popularity);
    }
  });

  it('should include niche information', async () => {
    const result = await useCase.execute();

    const firstSkill = result[0];
    expect(firstSkill).toBeDefined();
    expect(firstSkill.niche).toBeDefined();
    if (firstSkill.niche) {
      expect(firstSkill.niche.slug).toBeDefined();
    }
  });
});
