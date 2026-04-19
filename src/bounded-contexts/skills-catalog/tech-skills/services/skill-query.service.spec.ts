/**
 * Skill Query Service Tests
 *
 * Tests for tech skills query and caching
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  createTechSkill,
  DEFAULT_TECH_SKILLS,
  InMemoryCacheService,
  InMemoryTechSkillRepository,
} from '../../testing';
import type { TechSkill } from '../dto';
import { TECH_SKILLS_CACHE_KEYS } from '../interfaces';
import { SkillQueryService } from './skill-query.service';

describe('SkillQueryService', () => {
  let service: SkillQueryService;
  let techSkillRepo: InMemoryTechSkillRepository;
  let cacheService: InMemoryCacheService;

  beforeEach(() => {
    techSkillRepo = new InMemoryTechSkillRepository();
    techSkillRepo.seed(DEFAULT_TECH_SKILLS);

    cacheService = new InMemoryCacheService();

    service = new SkillQueryService(techSkillRepo, cacheService);
  });

  describe('getAllSkills', () => {
    it('should return all active skills', async () => {
      const result = await service.getAllSkills();

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return cached data if available', async () => {
      const cachedSkills: TechSkill[] = [
        createTechSkill({ slug: 'cached', nameEn: 'Cached Skill' }) as TechSkill,
      ];
      await cacheService.set(TECH_SKILLS_CACHE_KEYS.SKILLS_LIST, cachedSkills);

      const result = await service.getAllSkills();

      expect(result).toEqual(cachedSkills);
    });

    it('should cache results after fetching', async () => {
      expect(cacheService.has(TECH_SKILLS_CACHE_KEYS.SKILLS_LIST)).toBe(false);

      await service.getAllSkills();

      expect(cacheService.has(TECH_SKILLS_CACHE_KEYS.SKILLS_LIST)).toBe(true);
    });

    it('should order by popularity descending', async () => {
      const result = await service.getAllSkills();

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].popularity).toBeGreaterThanOrEqual(result[i].popularity);
      }
    });

    it('should include niche information', async () => {
      const result = await service.getAllSkills();

      const firstSkill = result[0];
      expect(firstSkill).toBeDefined();
      expect(firstSkill.niche).toBeDefined();
      if (firstSkill.niche) {
        expect(firstSkill.niche.slug).toBeDefined();
      }
    });
  });

  describe('getSkillsByNiche', () => {
    it('should filter skills by niche slug', async () => {
      const result = await service.getSkillsByNiche('frontend');

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

      const result = await service.getSkillsByNiche('frontend');

      expect(result).toEqual(cachedSkills);
    });

    it('should cache niche skills with unique key', async () => {
      await service.getSkillsByNiche('nodejs');

      expect(cacheService.has(`${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_NICHE}nodejs`)).toBe(true);
    });
  });

  describe('getSkillsByType', () => {
    it('should filter skills by type', async () => {
      const result = await service.getSkillsByType('FRAMEWORK');

      expect(result.length).toBeGreaterThan(0);
      result.forEach((skill) => {
        expect(skill.type).toBe('FRAMEWORK');
      });
    });

    it('should respect limit parameter', async () => {
      const result = await service.getSkillsByType('FRAMEWORK', 1);

      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should use default limit of 50', async () => {
      const result = await service.getSkillsByType('FRAMEWORK');

      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should not cache type queries', async () => {
      const initialSize = cacheService.size();

      await service.getSkillsByType('FRAMEWORK');

      expect(cacheService.size()).toBe(initialSize);
    });
  });
});
