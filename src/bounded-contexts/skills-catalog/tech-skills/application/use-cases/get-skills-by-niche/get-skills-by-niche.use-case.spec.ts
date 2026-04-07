/**
 * GetSkillsByNicheUseCase Tests
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
import { GetSkillsByNicheUseCase } from './get-skills-by-niche.use-case';

describe('GetSkillsByNicheUseCase', () => {
  let useCase: GetSkillsByNicheUseCase;
  let techSkillRepo: InMemoryTechSkillRepository;
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    techSkillRepo = new InMemoryTechSkillRepository();
    techSkillRepo.seed(DEFAULT_TECH_SKILLS);
    cacheService = new InMemoryCacheService();

    const repository = new TechSkillRepository(techSkillRepo as never);
    const cache = new CacheAdapter(cacheService as never);
    useCase = new GetSkillsByNicheUseCase(repository, cache);
  });

  it('should filter skills by niche slug', async () => {
    const result = await useCase.execute('frontend');

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    result.forEach((skill) => {
      if (skill.niche) {
        expect(skill.niche.slug).toBe('frontend');
      }
    });
  });

  it('should return cached niche skills if available', async () => {
    const cachedSkills: TechSkill[] = [
      createTechSkill({ slug: 'vue', nameEn: 'Vue.js' }) as TechSkill,
    ];
    await cacheService.set(`${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_NICHE}frontend`, cachedSkills);

    const result = await useCase.execute('frontend');

    expect(result).toEqual(cachedSkills);
  });

  it('should cache niche skills with unique key', async () => {
    await useCase.execute('nodejs');

    expect(cacheService.has(`${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_NICHE}nodejs`)).toBe(true);
  });
});
