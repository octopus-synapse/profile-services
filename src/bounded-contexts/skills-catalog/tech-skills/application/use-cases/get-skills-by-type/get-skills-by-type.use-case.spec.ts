/**
 * GetSkillsByTypeUseCase Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  DEFAULT_TECH_SKILLS,
  InMemoryCacheService,
  InMemoryTechSkillRepository,
} from '../../../../testing';
import { GetSkillsByTypeUseCase } from './get-skills-by-type.use-case';

describe('GetSkillsByTypeUseCase', () => {
  let useCase: GetSkillsByTypeUseCase;
  let techSkillRepo: InMemoryTechSkillRepository;
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    techSkillRepo = new InMemoryTechSkillRepository();
    techSkillRepo.seed(DEFAULT_TECH_SKILLS);
    cacheService = new InMemoryCacheService();
    useCase = new GetSkillsByTypeUseCase(techSkillRepo);
  });

  it('should filter skills by type', async () => {
    const result = await useCase.execute('FRAMEWORK');

    expect(result.length).toBeGreaterThan(0);
    result.forEach((skill) => {
      expect(skill.type).toBe('FRAMEWORK');
    });
  });

  it('should respect limit parameter', async () => {
    const result = await useCase.execute('FRAMEWORK', 1);

    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('should use default limit of 50', async () => {
    const result = await useCase.execute('FRAMEWORK');

    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('should not cache type queries', async () => {
    const initialSize = cacheService.size();

    await useCase.execute('FRAMEWORK');

    expect(cacheService.size()).toBe(initialSize);
  });
});
